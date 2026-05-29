import { builder } from '../schema.js'

builder.queryField('transactions', (t) =>
  t.prismaField({
    type: ['Transaction'],
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.transaction.findMany({
        ...query,
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)
