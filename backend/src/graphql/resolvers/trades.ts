import { builder } from '../schema.js'

builder.queryField('trades', (t) =>
  t.prismaField({
    type: ['Trade'],
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.trade.findMany({
        ...query,
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)
