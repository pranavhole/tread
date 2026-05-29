import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/use/ws'
import type { Context as WsContext } from 'graphql-ws'
import jwt from 'jsonwebtoken'
import { buildApp } from './app.js'
import { schema, type Context } from './graphql/index.js'
import { prisma } from './config/db.js'
import { ENV } from './config/env.js'
import { initSocket } from './services/socket.js'
import { ActiveSymbolStreamService } from './services/activeSymbolStreamService.js'
import { BinanceMultiTickerFeed } from './services/binanceMultiTickerFeed.js'
import { MarketBroadcastService } from './services/marketBroadcastService.js'
import { MarketUniverseService } from './services/marketUniverseService.js'

const start = async () => {
  const app = await buildApp()
  const httpServer = createServer(app)

  const wss = new WebSocketServer({ noServer: true })
  useServer(
    {
      schema,
      context: async (ctx: WsContext): Promise<Context> => {
        const authHeader = (ctx.connectionParams?.authorization as string) ?? ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
        let user: Context['user'] = null
        try {
          if (token) user = jwt.verify(token, String(ENV.JWT_SECRET)) as Context['user']
        } catch {}
        return { user, prisma }
      },
    },
    wss
  )

  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    if (pathname === '/graphql') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    }
  })

  const io = initSocket(httpServer)
  const marketUniverse = new MarketUniverseService()
  const initialTopSymbols = await marketUniverse.refreshSafely()
  const marketBroadcast = new MarketBroadcastService(io)
  const multiTickerFeed = new BinanceMultiTickerFeed(initialTopSymbols, marketBroadcast)
  const activeSymbolStream = new ActiveSymbolStreamService(io)

  multiTickerFeed.start()
  activeSymbolStream.start()

  setInterval(async () => {
    const previousSymbols = marketUniverse.getSymbols()
    const nextSymbols = await marketUniverse.refreshSafely()
    if (!nextSymbols.length) return

    if (JSON.stringify(previousSymbols) !== JSON.stringify(nextSymbols)) {
      multiTickerFeed.restart(nextSymbols)
      io.emit('market:topSymbols', nextSymbols)
    }
  }, ENV.MARKET_UNIVERSE_REFRESH_MS)

  io.on('connection', (socket) => {
    socket.emit('market:topSymbols', marketUniverse.getSymbols())

    socket.on('trade:executed', (trade) => {
      io.emit('trade:executed', trade)
    })

    socket.on('market:watch', (symbol: string) => {
      activeSymbolStream.setActiveSymbol(symbol)
    })
  })

  httpServer.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT}`)
    console.log(`GraphQL: http://localhost:${ENV.PORT}/graphql`)
  })
}

start()
