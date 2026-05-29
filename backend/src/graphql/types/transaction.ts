import { builder } from '../schema.js'

builder.prismaObject('Transaction', {
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeString('userId'),
    type: t.exposeString('type'),
    amount: t.exposeFloat('amount'),
    note: t.exposeString('note', { nullable: true }),
    createdAt: t.field({ type: 'String', resolve: (tx) => tx.createdAt.toISOString() }),
  }),
})
