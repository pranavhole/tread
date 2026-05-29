import { builder } from '../schema.js'
import { redis, MARKET_KEYS } from '../../services/redis.js'
import { PlaceOrderInput } from './auth.js'
import { resolveInitialOrderPrice } from './orderPricing.js'
import { getBuyPositionValues, getSellPositionValues } from '../../workers/matchEngineCore.js'

const FEE_RATE = 0.001

const isExecutableOrder = (args: {
  type: 'MARKET' | 'LIMIT' | 'STOP_LIMIT'
  side: 'BUY' | 'SELL'
  orderPrice: number
  marketPrice: number
}) => {
  if (args.type === 'MARKET') return true
  if (args.type !== 'LIMIT') return false
  if (args.side === 'BUY') return args.orderPrice >= args.marketPrice
  return args.orderPrice <= args.marketPrice
}

builder.queryField('orders', (t) =>
  t.prismaField({
    type: ['Order'],
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.order.findMany({
        ...query,
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)

builder.queryField('order', (t) =>
  t.prismaField({
    type: 'Order',
    nullable: true,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.order.findFirst({
        ...query,
        where: { id: String(args.id), userId: ctx.user.id },
      })
    },
  })
)

builder.mutationField('placeOrder', (t) =>
  t.prismaField({
    type: 'Order',
    args: { input: t.arg({ type: PlaceOrderInput, required: true }) },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      const { side, type, qty, price, stopPrice, timeInForce, symbol } = args.input
      if (!qty || qty <= 0) throw new Error('Invalid quantity')
      if (type === 'LIMIT' && (!price || price <= 0)) throw new Error('Limit order requires positive price')
      const normalizedSymbol = symbol ?? 'BTCUSDT'
      const marketPriceStr = await redis.get(MARKET_KEYS.price(normalizedSymbol))
      const marketPrice = marketPriceStr ? Number.parseFloat(marketPriceStr) : NaN
      const initialPrice = await resolveInitialOrderPrice({
        type: type as 'MARKET' | 'LIMIT' | 'STOP_LIMIT',
        requestedPrice: price ?? undefined,
        readMarketPrice: async () => marketPriceStr,
      })

      const normalizedSide = side as 'BUY' | 'SELL'
      const normalizedType = type as 'MARKET' | 'LIMIT' | 'STOP_LIMIT'
      const shouldFillNow =
        Number.isFinite(marketPrice) &&
        isExecutableOrder({
          type: normalizedType,
          side: normalizedSide,
          orderPrice: initialPrice,
          marketPrice,
        })

      if (shouldFillNow) {
        const fillPrice = marketPrice
        const notional = fillPrice * qty
        const fees = notional * FEE_RATE
        const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id } })
        if (!user) throw new Error('User not found')

        const position = await ctx.prisma.position.findUnique({
          where: { userId_symbol: { userId: ctx.user.id, symbol: normalizedSymbol } },
        })

        if (normalizedSide === 'BUY') {
          if (user.balance < notional + fees) throw new Error('Insufficient available balance')

          const nextPosition = getBuyPositionValues(position, qty, fillPrice)
          const order = await ctx.prisma.$transaction(async (tx) => {
            const filledOrder = await tx.order.create({
              ...query,
              data: {
                userId: ctx.user!.id,
                symbol: normalizedSymbol,
                side: normalizedSide as any,
                type: normalizedType as any,
                timeInForce: (timeInForce ?? 'GTC') as any,
                price: fillPrice,
                stopPrice: stopPrice ?? undefined,
                qty,
                filledQty: qty,
                fees,
                status: 'FILLED',
                filledAt: new Date(),
              },
            })

            await tx.user.update({
              where: { id: ctx.user!.id },
              data: { balance: { decrement: notional + fees } },
            })

            if (position) {
              await tx.position.update({
                where: { userId_symbol: { userId: ctx.user!.id, symbol: normalizedSymbol } },
                data: nextPosition,
              })
            } else {
              await tx.position.create({
                data: { userId: ctx.user!.id, symbol: normalizedSymbol, ...nextPosition },
              })
            }

            await tx.trade.create({
              data: {
                orderId: filledOrder.id,
                userId: ctx.user!.id,
                price: fillPrice,
                qty,
                side: 'BUY',
                fees,
                realizedPnl: 0,
                isMaker: false,
              },
            })
            await tx.transaction.create({
              data: { userId: ctx.user!.id, type: 'FEE', amount: fees, note: `Fee for BUY ${qty} ${normalizedSymbol}` },
            })

            return filledOrder
          })

          return order
        }

        if (!position || position.qty < qty) throw new Error('Insufficient position')

        const proceeds = fillPrice * qty
        const costBasis = position.avgPrice * qty
        const realizedPnl = proceeds - costBasis - fees
        const nextPosition = getSellPositionValues(position, qty, realizedPnl)

        const order = await ctx.prisma.$transaction(async (tx) => {
          const filledOrder = await tx.order.create({
            ...query,
            data: {
              userId: ctx.user!.id,
              symbol: normalizedSymbol,
              side: normalizedSide as any,
              type: normalizedType as any,
              timeInForce: (timeInForce ?? 'GTC') as any,
              price: fillPrice,
              stopPrice: stopPrice ?? undefined,
              qty,
              filledQty: qty,
              fees,
              status: 'FILLED',
              filledAt: new Date(),
            },
          })

          await tx.position.update({
            where: { userId_symbol: { userId: ctx.user!.id, symbol: normalizedSymbol } },
            data: {
              qty: nextPosition.qty,
              avgPrice: nextPosition.avgPrice,
              realizedPnl: { increment: nextPosition.realizedPnlIncrement },
            },
          })
          await tx.user.update({
            where: { id: ctx.user!.id },
            data: { balance: { increment: proceeds - fees } },
          })
          await tx.trade.create({
            data: {
              orderId: filledOrder.id,
              userId: ctx.user!.id,
              price: fillPrice,
              qty,
              side: 'SELL',
              fees,
              realizedPnl,
              isMaker: false,
            },
          })
          await tx.transaction.create({
            data: { userId: ctx.user!.id, type: 'FEE', amount: fees, note: `Fee for SELL ${qty} ${normalizedSymbol}` },
          })

          return filledOrder
        })

        return order
      }

      const order = await ctx.prisma.order.create({
        ...query,
        data: {
          userId: ctx.user.id,
          symbol: normalizedSymbol,
          side: normalizedSide as any,
          type: normalizedType as any,
          timeInForce: (timeInForce ?? 'GTC') as any,
          price: initialPrice,
          stopPrice: stopPrice ?? undefined,
          qty,
          status: 'OPEN',
        },
      })
      await redis.lpush(MARKET_KEYS.orderQueue, JSON.stringify({ orderId: order.id, userId: ctx.user.id }))
      return order
    },
  })
)

builder.mutationField('cancelOrder', (t) =>
  t.prismaField({
    type: 'Order',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      const order = await ctx.prisma.order.findFirst({ where: { id: String(args.id), userId: ctx.user.id } })
      if (!order) throw new Error('Order not found')
      if (order.status !== 'OPEN') throw new Error('Only OPEN orders can be cancelled')
      return ctx.prisma.order.update({
        ...query,
        where: { id: String(args.id) },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
    },
  })
)

builder.mutationField('cancelOpenOrders', (t) =>
  t.field({
    type: 'Int',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')

      const result = await ctx.prisma.order.updateMany({
        where: {
          userId: ctx.user.id,
          status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      })

      return result.count
    },
  })
)
