import { builder } from '../schema.js'

builder.queryField('position', (t) =>
  t.prismaField({
    type: 'Position',
    nullable: true,
    args: { symbol: t.arg.string({ required: false }) },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.position.findUnique({
        ...query,
        where: { userId_symbol: { userId: ctx.user.id, symbol: args.symbol ?? 'BTCUSDT' } },
      })
    },
  })
)
