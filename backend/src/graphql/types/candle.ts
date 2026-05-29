import { builder } from '../schema.js'

builder.prismaObject('Candle', {
  fields: (t) => ({
    id: t.exposeID('id'),
    symbol: t.exposeString('symbol'),
    interval: t.exposeString('interval'),
    openTime: t.field({ type: 'String', resolve: (c) => c.openTime.toISOString() }),
    open: t.exposeFloat('open'),
    high: t.exposeFloat('high'),
    low: t.exposeFloat('low'),
    close: t.exposeFloat('close'),
    volume: t.exposeFloat('volume'),
    closeTime: t.field({ type: 'String', resolve: (c) => c.closeTime.toISOString() }),
  }),
})
