import { builder } from '../schema.js'

builder.queryField('notifications', (t) =>
  t.prismaField({
    type: ['Notification'],
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.notification.findMany({
        ...query,
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)

builder.mutationField('createNotification', (t) =>
  t.prismaField({
    type: 'Notification',
    args: {
      symbol: t.arg.string({ required: true }),
      targetPrice: t.arg.float({ required: true }),
      condition: t.arg.string({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      return ctx.prisma.notification.create({
        ...query,
        data: {
          userId: ctx.user.id,
          symbol: args.symbol,
          targetPrice: args.targetPrice,
          condition: args.condition as any,
        },
      })
    },
  })
)

builder.mutationField('deleteNotification', (t) =>
  t.field({
    type: 'Boolean',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user) throw new Error('Not authenticated')
      const notif = await ctx.prisma.notification.findFirst({
        where: { id: String(args.id), userId: ctx.user.id },
      })
      if (!notif) throw new Error('Notification not found')
      await ctx.prisma.notification.delete({ where: { id: String(args.id) } })
      return true
    },
  })
)
