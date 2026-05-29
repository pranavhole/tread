import WebSocket from 'ws'
import type { Server } from 'socket.io'
import type { Candle, Order, Trade } from '../types/index.js'
import { orderbook } from '../state/orderbook.js'
import { redis, MARKET_KEYS } from './redis.js'
import { ENV } from '../config/env.js'

type BinanceStreamPayload = {
  stream: string
  data: any
}

export class ActiveSymbolStreamService {
  private activeSymbol = 'BTCUSDT'
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null

  constructor(private io: Server) {}

  getSymbol() {
    return this.activeSymbol
  }

  setActiveSymbol(symbol: string) {
    const nextSymbol = symbol.toUpperCase()
    if (!nextSymbol || nextSymbol === this.activeSymbol) return

    this.activeSymbol = nextSymbol
    this.restart()
  }

  start() {
    this.connect()
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

  private restart() {
    this.stop()
    this.start()
  }

  private connect() {
    const base = this.activeSymbol.toLowerCase()
    const streams = [
      `${base}@kline_1m`,
      `${base}@depth20@100ms`,
      `${base}@trade`,
    ]

    const url = `${ENV.BINANCE_WS_URL}/stream?streams=${streams.join('/')}`
    this.ws = new WebSocket(url)

    this.ws.on('open', () => {
      console.log(`Connected active market stream for ${this.activeSymbol}`)
    })

    this.ws.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString()) as BinanceStreamPayload
        await this.handleMessage(payload)
      } catch (error) {
        console.error('Failed to parse active market stream payload', error)
      }
    })

    this.ws.on('close', () => {
      this.scheduleReconnect()
    })

    this.ws.on('error', (error) => {
      console.error('Active market websocket error', error)
    })
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, 3000)
  }

  private async handleMessage(payload: BinanceStreamPayload) {
    const { stream, data } = payload

    if (stream.endsWith('@kline_1m')) {
      const k = data.k
      const candle: Candle = {
        time: Number(k.t),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
      }

      orderbook.currentPrice = candle.close
      await redis.set(MARKET_KEYS.price(this.activeSymbol), String(candle.close))

      this.io.emit('candle:update', {
        symbol: this.activeSymbol,
        ...candle,
      })
      return
    }

    if (stream.endsWith('@depth20@100ms')) {
      const rawBids = data.bids ?? data.b ?? []
      const rawAsks = data.asks ?? data.a ?? []
      const bids: Order[] = rawBids.map((bid: [string, string], index: number) => ({
        id: `bid-${index}`,
        price: Number(bid[0]),
        qty: Number(bid[1]),
        side: 'buy',
      }))

      const asks: Order[] = rawAsks.map((ask: [string, string], index: number) => ({
        id: `ask-${index}`,
        price: Number(ask[0]),
        qty: Number(ask[1]),
        side: 'sell',
      }))

      orderbook.bids = bids
      orderbook.asks = asks

      await redis.set(MARKET_KEYS.bids(this.activeSymbol), JSON.stringify(bids))
      await redis.set(MARKET_KEYS.asks(this.activeSymbol), JSON.stringify(asks))

      this.io.emit('orderbook:update', {
        symbol: this.activeSymbol,
        bids,
        asks,
      })
      return
    }

    if (stream.endsWith('@trade')) {
      const trade: Trade = {
        price: Number(data.p),
        qty: Number(data.q),
        timestamp: Number(data.T),
        side: data.m ? 'sell' : 'buy',
      }

      this.io.emit('trade:executed', {
        symbol: this.activeSymbol,
        ...trade,
      })
    }
  }
}
