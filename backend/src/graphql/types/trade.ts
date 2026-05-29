import { builder } from '../schema.js'

builder.prismaObject('Trade', {
  fields: (t) => ({
    id: t.exposeID('id'),
    orderId: t.exposeString('orderId'),
    userId: t.exposeString('userId'),
    price: t.exposeFloat('price'),
    qty: t.exposeFloat('qty'),
    side: t.exposeString('side'),
    fees: t.exposeFloat('fees'),
    realizedPnl: t.exposeFloat('realizedPnl'),
    isMaker: t.exposeBoolean('isMaker'),
    createdAt: t.field({ type: 'String', resolve: (t) => t.createdAt.toISOString() }),
    updatedAt: t.field({ type: 'String', resolve: (t) => t.updatedAt.toISOString() }),
  }),
})
