import type { Server } from 'socket.io'
import type { MarketQuoteUpdate } from '../types/index.js'

export class MarketBroadcastService {
  constructor(private io: Server) {}

  emitQuote(update: MarketQuoteUpdate) {
    this.io.emit('price:update', update)
  }
}
