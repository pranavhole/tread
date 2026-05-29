import { Redis } from 'ioredis'
import { ENV } from '../config/env.js'

const parsePort = (val: unknown, fallback = 6379) => {
  const n = parseInt(String(val ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const REDIS_HOST = ENV.REDIS_HOST ?? '127.0.0.1'
const REDIS_PORT = parsePort(ENV.REDIS_PORT, 6379)
const REDIS_PASSWORD = ENV.REDIS_PASSWORD ?? undefined

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
})

export const redisSub = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
})

const normalizeSymbol = (symbol: string) => symbol.toUpperCase()

export const MARKET_KEYS = {
  price: (symbol: string) => `market:${normalizeSymbol(symbol)}:price`,
  change: (symbol: string) => `market:${normalizeSymbol(symbol)}:change`,
  volume: (symbol: string) => `market:${normalizeSymbol(symbol)}:volume`,
  bids: (symbol: string) => `market:${normalizeSymbol(symbol)}:bids`,
  asks: (symbol: string) => `market:${normalizeSymbol(symbol)}:asks`,
  topSymbols: 'market:top:symbols',
  orderQueue: 'order_queue',
} as const

redis.on('ready', () => console.log('Redis ready'))
redis.on('connect', () => console.log('Redis connected'))
redis.on('error', (err: unknown) => console.error('Redis error:', err))
