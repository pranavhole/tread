import axios from 'axios'
import { builder } from '../schema.js'

builder.queryField('candles', (t) =>
  t.prismaField({
    type: ['Candle'],
    args: {
      symbol: t.arg.string({ required: true }),
      interval: t.arg.string({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      const { symbol, interval } = args
      const latestCandles = async () => {
        const candles = await ctx.prisma.candle.findMany({
          ...query,
          where: { symbol, interval },
          orderBy: { openTime: 'desc' },
          take: 500,
        })

        return candles.reverse()
      }

      const latest = await ctx.prisma.candle.findFirst({
        where: { symbol, interval },
        orderBy: { closeTime: 'desc' },
      })
      const oneMinuteAgo = new Date(Date.now() - 60_000)
      if (latest && latest.closeTime > oneMinuteAgo) {
        return latestCandles()
      }
      const { data } = await axios.get('https://api.binance.com/api/v3/klines', {
        params: { symbol, interval, limit: 500 },
      })
      await Promise.all(
        (data as any[]).map((k: any[]) =>
          ctx.prisma.candle.upsert({
            where: { symbol_interval_openTime: { symbol, interval, openTime: new Date(k[0]) } },
            update: {
              open: parseFloat(k[1]),
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4]),
              volume: parseFloat(k[5]),
              closeTime: new Date(k[6]),
            },
            create: {
              symbol,
              interval,
              openTime: new Date(k[0]),
              open: parseFloat(k[1]),
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4]),
              volume: parseFloat(k[5]),
              closeTime: new Date(k[6]),
            },
          })
        )
      )
      return latestCandles()
    },
  })
)
