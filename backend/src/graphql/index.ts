// Import all types and resolvers FIRST (they register on the builder)
import './types/user.js'
import './types/order.js'
import './types/trade.js'
import './types/position.js'
import './types/candle.js'
import './types/notification.js'
import './types/transaction.js'
import './resolvers/auth.js'
import './resolvers/orders.js'
import './resolvers/trades.js'
import './resolvers/position.js'
import './resolvers/candles.js'
import './resolvers/notifications.js'
import './resolvers/transactions.js'
import './resolvers/subscriptions.js'

import { builder } from './schema.js'
import { ApolloServer } from '@apollo/server'
import type { Context } from './schema.js'

export const schema = builder.toSchema()
export const apolloServer = new ApolloServer<Context>({ schema })
export type { Context }
