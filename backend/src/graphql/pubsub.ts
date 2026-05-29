import { RedisPubSub } from 'graphql-redis-subscriptions'
import { ENV } from '../config/env.js'

export const pubsub = new RedisPubSub({
  connection: {
    host: ENV.REDIS_HOST,
    port: ENV.REDIS_PORT,
    password: ENV.REDIS_PASSWORD || undefined,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  },
})

export const orderUpdatedChannel = (userId: string) => `ORDER_UPDATED:${userId}`
