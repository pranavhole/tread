import { builder } from '../schema.js'

builder.prismaObject('User', {
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    username: t.exposeString('username', { nullable: true }),
    balance: t.exposeFloat('balance'),
    role: t.exposeString('role'),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.field({ type: 'String', resolve: (u) => u.createdAt.toISOString() }),
    orders: t.relation('orders'),
    trades: t.relation('trades'),
    positions: t.relation('positions'),
    notifications: t.relation('notifications'),
    transactions: t.relation('transactions'),
  }),
})
