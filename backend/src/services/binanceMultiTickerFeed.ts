import WebSocket from 'ws'
import { redis, MARKET_KEYS } from './redis.js'
import { MarketBroadcastService } from './marketBroadcastService.js'
import type { MarketQuoteUpdate } from '../types/index.js'
import { ENV } from '../config/env.js'

type BinanceCombinedTickerPayload = {
  stream: string
  data: {
    s: string
    c: string
    P: string
    q: string
  }
}

export class BinanceMultiTickerFeed {
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private symbols: string[]

  constructor(symbols: string[], private broadcast: MarketBroadcastService) {
    this.symbols = symbols
  }

  start() {
    if (!this.symbols.length) return
    this.connect()
  }

  restart(symbols: string[]) {
    this.symbols = symbols
    this.stop()
    this.start()
  }

  stop() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }
  }

  private connect() {
    if (!this.symbols.length) return

    const streams = this.symbols.map((symbol) => `${symbol.toLowerCase()}@ticker`)
    const url = `${ENV.BINANCE_WS_URL}/stream?streams=${streams.join('/')}`
    this.ws = new WebSocket(url)

    this.ws.on('open', () => {
      console.log(`Connected top-market ticker feed for ${this.symbols.length} symbols`)
    })

    this.ws.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString()) as BinanceCombinedTickerPayload
        await this.handleTicker(payload)
      } catch (error) {
        console.error('Failed to parse top-market ticker update', error)
      }
    })

    this.ws.on('close', () => {
      this.scheduleReconnect()
    })

    this.ws.on('error', (error) => {
      console.error('Top-market ticker websocket error', error)
    })
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, 3000)
  }

  private async handleTicker(payload: BinanceCombinedTickerPayload) {
    const update: MarketQuoteUpdate = {
      symbol: payload.data.s.toUpperCase(),
      price: Number(payload.data.c),
      change24h: Number(payload.data.P),
      volume: Number(payload.data.q),
      ts: Date.now(),
    }

    await redis.mset(
      MARKET_KEYS.price(update.symbol), String(update.price),
      MARKET_KEYS.change(update.symbol), String(update.change24h),
      MARKET_KEYS.volume(update.symbol), String(update.volume)
    )

    this.broadcast.emitQuote(update)
  }
}
