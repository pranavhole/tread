import { builder } from '../schema.js'

builder.prismaObject('Order', {
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeString('userId'),
    symbol: t.exposeString('symbol'),
    side: t.exposeString('side'),
    type: t.exposeString('type'),
    timeInForce: t.exposeString('timeInForce'),
    price: t.exposeFloat('price'),
    stopPrice: t.exposeFloat('stopPrice', { nullable: true }),
    qty: t.exposeFloat('qty'),
    filledQty: t.exposeFloat('filledQty'),
    fees: t.exposeFloat('fees'),
    status: t.exposeString('status'),
    filledAt: t.field({ type: 'String', nullable: true, resolve: (o) => o.filledAt?.toISOString() ?? null }),
    cancelledAt: t.field({ type: 'String', nullable: true, resolve: (o) => o.cancelledAt?.toISOString() ?? null }),
    createdAt: t.field({ type: 'String', resolve: (o) => o.createdAt.toISOString() }),
    updatedAt: t.field({ type: 'String', resolve: (o) => o.updatedAt.toISOString() }),
    trades: t.relation('trades'),
  }),
})
