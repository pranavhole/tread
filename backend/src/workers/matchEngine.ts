import { prisma } from '../config/db.js'
import { redis, MARKET_KEYS } from '../services/redis.js'
import { getBuyPositionValues, getSellPositionValues } from './matchEngineCore.js'

const publishOrderUpdate = async (orderId: string, userId: string) => {
  const channel = `ORDER_UPDATED:${userId}`
  // graphql-redis-subscriptions listens on channel and expects payload wrapped as { [channel]: data }
  const payload = JSON.stringify({ [channel]: { orderId, userId } })
  await redis.publish(channel, payload)
}

const processOrder = async () => {
  await prisma.$connect()
  console.log('⚙️ Match Engine Worker Started (Prisma + Redis PubSub)')

  while (true) {
    try {
      const result = await redis.brpop(MARKET_KEYS.orderQueue, 0)
      if (!result) continue

      const { orderId, userId } = JSON.parse(result[1])

      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (!order || order.status !== 'OPEN') continue

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) continue

      const position = await prisma.position.findUnique({
        where: { userId_symbol: { userId, symbol: order.symbol } },
      })

      const marketPriceStr = await redis.get(MARKET_KEYS.price(order.symbol))
      if (!marketPriceStr) {
        await redis.lpush(MARKET_KEYS.orderQueue, JSON.stringify({ orderId, userId }))
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      const marketPrice = parseFloat(marketPriceStr)

      let shouldFill = false
      let fillPrice = marketPrice

      if (order.type === 'MARKET') {
        shouldFill = true
        fillPrice = marketPrice
      } else if (order.type === 'LIMIT') {
        if (order.side === 'BUY' && order.price >= marketPrice) {
          shouldFill = true
          fillPrice = marketPrice
        } else if (order.side === 'SELL' && order.price <= marketPrice) {
          shouldFill = true
          fillPrice = marketPrice
        }
      }

      if (shouldFill) {
        const cost = fillPrice * order.qty
        const FEE_RATE = 0.001
        const fees = cost * FEE_RATE

        if (order.side === 'BUY') {
          if (user.balance >= cost + fees) {
            const nextPosition = getBuyPositionValues(position, order.qty, fillPrice)
            const positionWrite = position
              ? prisma.position.update({
                  where: { userId_symbol: { userId, symbol: order.symbol } },
                  data: nextPosition,
                })
              : prisma.position.create({
                  data: {
                    userId,
                    symbol: order.symbol,
                    ...nextPosition,
                  },
                })

            await prisma.$transaction([
              prisma.user.update({
                where: { id: userId },
                data: { balance: { decrement: cost + fees } },
              }),
              positionWrite,
              prisma.order.update({
                where: { id: orderId },
                data: { status: 'FILLED', filledQty: order.qty, price: fillPrice, fees, filledAt: new Date() },
              }),
              prisma.trade.create({
                data: { orderId, userId, price: fillPrice, qty: order.qty, side: 'BUY', fees, realizedPnl: 0, isMaker: false },
              }),
              prisma.transaction.create({
                data: { userId, type: 'FEE', amount: fees, note: `Fee for BUY ${order.qty} ${order.symbol}` },
              }),
            ])

            await publishOrderUpdate(orderId, userId)
            console.log(`✅ Filled BUY ${orderId} @ ${fillPrice}`)
          } else {
            await prisma.order.update({
              where: { id: orderId },
              data: { status: 'CANCELLED', cancelledAt: new Date() },
            })
            await publishOrderUpdate(orderId, userId)
            console.log(`❌ Insufficient funds for ${orderId}`)
          }
        } else if (order.side === 'SELL') {
          if (position && position.qty >= order.qty) {
            const proceeds = fillPrice * order.qty
            const costBasis = position.avgPrice * order.qty
            const realizedPnl = proceeds - costBasis - fees
            const nextPosition = getSellPositionValues(position, order.qty, realizedPnl)

            await prisma.$transaction([
              prisma.position.update({
                where: { userId_symbol: { userId, symbol: order.symbol } },
                data: {
                  qty: nextPosition.qty,
                  avgPrice: nextPosition.avgPrice,
                  realizedPnl: { increment: nextPosition.realizedPnlIncrement },
                },
              }),
              prisma.user.update({
                where: { id: userId },
                data: { balance: { increment: proceeds - fees } },
              }),
              prisma.order.update({
                where: { id: orderId },
                data: { status: 'FILLED', filledQty: order.qty, price: fillPrice, fees, filledAt: new Date() },
              }),
              prisma.trade.create({
                data: { orderId, userId, price: fillPrice, qty: order.qty, side: 'SELL', fees, realizedPnl, isMaker: false },
              }),
              prisma.transaction.create({
                data: { userId, type: 'FEE', amount: fees, note: `Fee for SELL ${order.qty} ${order.symbol}` },
              }),
            ])

            await publishOrderUpdate(orderId, userId)
            console.log(`✅ Filled SELL ${orderId} @ ${fillPrice}`)
          } else {
            await prisma.order.update({
              where: { id: orderId },
              data: { status: 'CANCELLED', cancelledAt: new Date() },
            })
            await publishOrderUpdate(orderId, userId)
            console.log(`❌ Insufficient position for ${orderId}`)
          }
        }
      } else {
        console.log(`⏳ Limit order ${orderId} pending... (Price: ${marketPrice})`)
      }
    } catch (error) {
      console.error('Worker Error:', error)
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}

processOrder()
