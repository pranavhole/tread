import { builder } from '../schema.js'
import { pubsub } from '../pubsub.js'

builder.subscriptionField('orderUpdated', (t) =>
  t.prismaField({
    type: 'Order',
    subscribe: (_root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return pubsub.asyncIterator(`ORDER_UPDATED:${ctx.user.id}`)
    },
    resolve: async (query, payload: any, _args, ctx) => {
      return ctx.prisma.order.findUniqueOrThrow({
        ...query,
        where: { id: payload.orderId },
      })
    },
  })
)
