import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import type { Order, Trade } from './profileTypes';

const EMPTY_ORDERS: Order[] = [];
const EMPTY_TRADES: Trade[] = [];
const INR_PER_USDT = 83.5;

const finiteNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const selectProfileUser = (state: RootState) => state.auth.user;
export const selectProfilePositions = (state: RootState) => state.positions.items;
export const selectProfileOrders = (state: RootState) => state.orders.history;
export const selectOpenOrders = (state: RootState) => state.orders.openOrders;
export const selectTradesHistory = (state: RootState) => state.trades.history;
export const selectTransactions = (state: RootState) => state.transactions.items;
export const selectMarketPrices = (state: RootState) => state.marketDirectory.prices;
export const selectActiveMarketPrice = (state: RootState) => state.market.currentPrice;
export const selectActiveSymbol = (state: RootState) => state.market.activeSymbol;

export const selectPositionsWithMarketData = createSelector(
  [selectProfilePositions, selectMarketPrices, selectActiveSymbol, selectActiveMarketPrice],
  (positions, prices, activeSymbol, activePrice) =>
    positions.map((position) => {
      const qty = finiteNumber(position.qty);
      const avgPrice = finiteNumber(position.avgPrice);
      const currentPrice =
        finiteNumber(prices[position.symbol], NaN) ||
        (position.symbol === activeSymbol ? finiteNumber(activePrice, avgPrice) : avgPrice);
      const marketValue = qty * currentPrice;
      const costBasis = qty * avgPrice;
      const unrealizedPnl = qty * (currentPrice - avgPrice);
      const percentChange = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

      return {
        ...position,
        qty,
        avgPrice,
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPnl,
        percentChange,
      };
    })
);

export const selectWalletSummary = createSelector(
  [selectProfileUser, selectPositionsWithMarketData, selectOpenOrders],
  (user, positions, openOrders) => {
    const balance = finiteNumber(user?.balance);
    const lockedBalance = openOrders.reduce((total, order) => {
      if (order.side !== 'BUY') return total;

      const remainingQty = Math.max(finiteNumber(order.qty) - finiteNumber(order.filledQty), 0);
      const referencePrice = finiteNumber(order.price) > 0 ? finiteNumber(order.price) : 0;
      return total + remainingQty * referencePrice;
    }, 0);
    const unrealizedPnl = positions.reduce(
      (total, position) => total + position.unrealizedPnl,
      0
    );
    const realizedPnl = positions.reduce(
      (total, position) => total + position.realizedPnl,
      0
    );
    const portfolioValue = positions.reduce(
      (total, position) => total + position.marketValue,
      0
    );

    return {
      totalBalance: balance + portfolioValue,
      accountBalance: balance,
      availableBalance: Math.max(balance - lockedBalance, 0),
      lockedBalance,
      unrealizedPnl,
      realizedPnl,
      portfolioValue,
    };
  }
);

export const selectPerformanceStats = createSelector(
  [selectTradesHistory, selectPositionsWithMarketData],
  (trades, positions) => {
    const resolvedTrades = trades.length > 0 ? trades : EMPTY_TRADES;
    const winningTrades = resolvedTrades.filter((trade) => trade.realizedPnl > 0);
    const realizedPnl = positions.reduce(
      (total, position) => total + position.realizedPnl,
      0
    );
    const unrealizedPnl = positions.reduce(
      (total, position) => total + position.unrealizedPnl,
      0
    );
    const bestTrade = resolvedTrades.reduce<Trade | null>(
      (best, trade) =>
        !best || trade.realizedPnl > best.realizedPnl ? trade : best,
      null
    );
    const worstTrade = resolvedTrades.reduce<Trade | null>(
      (worst, trade) =>
        !worst || trade.realizedPnl < worst.realizedPnl ? trade : worst,
      null
    );

    return {
      totalTrades: resolvedTrades.length,
      winRate:
        resolvedTrades.length > 0
          ? (winningTrades.length / resolvedTrades.length) * 100
          : 0,
      totalPnl: realizedPnl + unrealizedPnl,
      bestTrade,
      worstTrade,
    };
  }
);

export const selectOrderBuckets = createSelector(
  [selectProfileOrders],
  (orders) => {
    const source = orders.length > 0 ? orders : EMPTY_ORDERS;
    return {
      openOrders: source.filter(
        (order) =>
          order.status === 'OPEN' ||
          order.status === 'PARTIAL_FILL' ||
          order.status === 'PARTIALLY_FILLED'
      ),
      history: source.filter(
        (order) =>
          order.status !== 'OPEN' &&
          order.status !== 'PARTIAL_FILL' &&
          order.status !== 'PARTIALLY_FILLED'
      ),
    };
  }
);

export const selectTradeRows = createSelector(
  [selectTradesHistory, selectProfileOrders],
  (trades, orders) => {
    const orderMap = new Map(orders.map((order) => [order.id, order]));
    return trades.map((trade) => {
      const order = orderMap.get(trade.orderId);
      return {
        ...trade,
        symbol: order?.symbol ?? 'BTCUSDT',
        type: order?.type ?? 'MARKET',
        status: order?.status ?? 'FILLED',
      };
    });
  }
);

export const selectPortfolioSeries = createSelector(
  [selectProfileUser, selectTransactions, selectTradesHistory],
  (user, transactions, trades) => {
    const timeline = [...transactions, ...trades]
      .map((entry) => {
        const createdAt = new Date(entry.createdAt).getTime();
        const delta =
          'type' in entry
            ? entry.type === 'WITHDRAWAL' || entry.type === 'FEE'
              ? -Math.abs(entry.amount)
              : Math.abs(entry.amount)
            : entry.realizedPnl - entry.fees;

        return {
          createdAt,
          delta,
        };
      })
      .sort((left, right) => left.createdAt - right.createdAt);

    let runningBalance = user?.balance ?? 0;
    if (timeline.length === 0) {
      return [runningBalance];
    }

    return timeline.map((point) => {
      runningBalance += point.delta;
      return runningBalance;
    });
  }
);

export const selectProfileCsvRows = createSelector(
  [selectTradeRows],
  (rows) =>
    rows.map((row) => ({
      time: row.createdAt,
      symbol: row.symbol,
      type: row.type,
      side: row.side,
      price: row.price,
      quantity: row.qty,
      fees: row.fees,
      realizedPnl: row.realizedPnl,
    }))
);

export const convertDisplayValue = (value: number, currency: 'USDT' | 'INR') =>
  currency === 'INR' ? value * INR_PER_USDT : value;
