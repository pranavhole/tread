import dotenv from 'dotenv'
dotenv.config()

const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

export const ENV = {
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/crypto_trading',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretkey_change_this_in_production',
  BINANCE_WS_URL: process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  MARKET_UNIVERSE_REFRESH_MS: Number(process.env.MARKET_UNIVERSE_REFRESH_MS) || 300000,
}
