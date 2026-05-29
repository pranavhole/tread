import { builder } from '../schema.js'

builder.prismaObject('Position', {
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeString('userId'),
    symbol: t.exposeString('symbol'),
    qty: t.exposeFloat('qty'),
    avgPrice: t.exposeFloat('avgPrice'),
    realizedPnl: t.exposeFloat('realizedPnl'),
    leverage: t.exposeFloat('leverage'),
    createdAt: t.field({ type: 'String', resolve: (p) => p.createdAt.toISOString() }),
    updatedAt: t.field({ type: 'String', resolve: (p) => p.updatedAt.toISOString() }),
  }),
})
