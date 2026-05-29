import { builder } from '../schema.js'

builder.prismaObject('Notification', {
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeString('userId'),
    symbol: t.exposeString('symbol'),
    targetPrice: t.exposeFloat('targetPrice'),
    condition: t.exposeString('condition'),
    triggered: t.exposeBoolean('triggered'),
    triggeredAt: t.field({ type: 'String', nullable: true, resolve: (n) => n.triggeredAt?.toISOString() ?? null }),
    createdAt: t.field({ type: 'String', resolve: (n) => n.createdAt.toISOString() }),
  }),
})
