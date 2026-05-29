import axios from 'axios'
import { redis, MARKET_KEYS } from './redis.js'

type Binance24hrTicker = {
  symbol: string
  quoteVolume: string
}

export class MarketUniverseService {
  private topSymbols: string[] = []

  getSymbols() {
    return this.topSymbols
  }

  async refresh() {
    const { data } = await axios.get<Binance24hrTicker[]>(
      'https://api.binance.com/api/v3/ticker/24hr'
    )

    this.topSymbols = data
      .filter((item) => item.symbol.endsWith('USDT'))
      .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
      .slice(0, 100)
      .map((item) => item.symbol.toUpperCase())

    await redis.set(MARKET_KEYS.topSymbols, JSON.stringify(this.topSymbols))
    return this.topSymbols
  }

  async refreshSafely() {
    try {
      return await this.refresh()
    } catch (error) {
      console.error('Failed to refresh market universe', error)
      return this.topSymbols
    }
  }
}
