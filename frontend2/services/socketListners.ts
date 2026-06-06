import type { AppDispatch } from '../app/store';
import { store } from '../app/store';
import { getSocket } from './socket';
import { updatePrice, upsertCandle } from '../features/market/marketSlice';
import { setSymbols, upsertQuote } from '../features/marketDirectory/marketDirectorySlice';
import { updateOrderbook } from '../features/orderbook/orderbookSlice';
import { addTrades } from '../features/trades/tradesSlice';
import { processOrderUpdate } from '../features/orders/orderUpdatesSlice';
import { loadTrades } from '../features/trades/tradesSlice';
import { loadTransactions } from '../features/transactions/transactionsSlice';
import { fetchUserProfile } from '../features/auth/authSlice';

let publicListenersInitialized = false;
let joinedUserId: string | undefined;
const MARKET_UI_BATCH_MS = 2000;

type OrderbookSnapshot = {
  symbol?: string;
  bids: Array<{ price: number; qty: number }>;
  asks: Array<{ price: number; qty: number }>;
};

type TradeTick = {
  price: number;
  qty: number;
  timestamp: number;
  side?: 'buy' | 'sell';
};

let pendingOrderbook: OrderbookSnapshot | null = null;
let pendingTrades: TradeTick[] = [];
let marketFlushTimer: ReturnType<typeof setTimeout> | null = null;

const flushBatchedMarketUpdates = (dispatch: AppDispatch) => {
  marketFlushTimer = null;
  const activeSymbol = store.getState().market.activeSymbol;

  if (pendingOrderbook && (!pendingOrderbook.symbol || pendingOrderbook.symbol === activeSymbol)) {
    dispatch(updateOrderbook({
      bids: pendingOrderbook.bids,
      asks: pendingOrderbook.asks,
    }));
  }

  if (pendingTrades.length > 0) {
    dispatch(addTrades(pendingTrades));
  }

  pendingOrderbook = null;
  pendingTrades = [];
};

const scheduleMarketFlush = (dispatch: AppDispatch) => {
  if (marketFlushTimer) return;
  marketFlushTimer = setTimeout(() => flushBatchedMarketUpdates(dispatch), MARKET_UI_BATCH_MS);
};

export const initializeSocketListeners = (dispatch: AppDispatch, userId: string | undefined) => {
  const socket = getSocket();

  if (!socket) return;

  if (!publicListenersInitialized) {
    socket.on('market:topSymbols', (symbols: string[]) => {
      dispatch(setSymbols(symbols));
    });

    // 1. Price Ticker
    socket.on('price:update', (data: {
      symbol: string;
      price: number;
      change24h?: number;
      volume?: number;
    }) => {
      dispatch(upsertQuote({
        symbol: data.symbol,
        price: Number(data.price),
        change24h: Number(data.change24h ?? 0),
        volume: Number(data.volume ?? 0),
      }));

      if (data.symbol === store.getState().market.activeSymbol) {
        dispatch(updatePrice(Number(data.price)));
      }
    });

    socket.on('candle:update', (data: {
      symbol: string;
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }) => {
      if (data.symbol !== store.getState().market.activeSymbol) return;

      dispatch(upsertCandle({
        time: Number(data.time),
        open: Number(data.open),
        high: Number(data.high),
        low: Number(data.low),
        close: Number(data.close),
        volume: Number(data.volume),
      }));
    });

    // 2. Orderbook (Keep on Socket)
    socket.on('orderbook:update', (data) => {
      if (data.symbol !== store.getState().market.activeSymbol) return;
      pendingOrderbook = {
        symbol: data.symbol,
        bids: data.bids,
        asks: data.asks,
      };
      scheduleMarketFlush(dispatch);
    });

    // 3. Trades (Keep on Socket)
    socket.on('trade:executed', (data) => {
      if (data.symbol && data.symbol !== store.getState().market.activeSymbol) return;

      pendingTrades.unshift({
        price: data.price,
        qty: data.qty,
        timestamp: Number(data.timestamp ?? new Date(data.createdAt || Date.now()).getTime()),
        side: data.side,
      });
      pendingTrades = pendingTrades.slice(0, 50);
      scheduleMarketFlush(dispatch);
    });

    publicListenersInitialized = true;
  }

  if (!userId || joinedUserId === userId) return;

  joinedUserId = userId;
  socket.emit('join:user', userId);

  // 4. User Orders (Keep on Socket)
  socket.off('order:update');
  socket.on('order:update', (order) => {
    dispatch(processOrderUpdate(order));
    if (order.status === 'FILLED' || order.status === 'PARTIAL_FILL' || order.status === 'PARTIALLY_FILLED') {
      dispatch(fetchUserProfile());
      dispatch(loadTrades());
      dispatch(loadTransactions());
    }
  });
};
