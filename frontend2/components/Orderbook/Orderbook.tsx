"use client";

import React from "react";
import { useAppSelector } from "../../app/hooks";
import { formatMarketSymbol, formatPrice, formatQty, getBaseAsset } from "../../utils/format";

type BookRow = {
  id?: string;
  price: number;
  qty: number;
};

const rowClass =
  "relative grid h-6 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-4 text-xs leading-none hover:bg-brand-highlight/60";

const Orderbook: React.FC = () => {
  const { bids, asks } = useAppSelector((state) => state.orderbook);
  const currentPrice = useAppSelector((state) => state.market.currentPrice);
  const activeSymbol = useAppSelector((state) => state.market.activeSymbol);
  const baseAsset = getBaseAsset(activeSymbol);

  const visibleAsks = asks.slice(0, 12).reverse();
  const visibleBids = bids.slice(0, 12);
  const maxAskQty = Math.max(...visibleAsks.map((ask) => ask.qty), 0.0001);
  const maxBidQty = Math.max(...visibleBids.map((bid) => bid.qty), 0.0001);
  const bestAsk = asks[0]?.price ?? currentPrice;
  const bestBid = bids[0]?.price ?? currentPrice;
  const spread = Math.max(bestAsk - bestBid, 0);
  const spreadPercent = currentPrice > 0 ? (spread / currentPrice) * 100 : 0;
  const hasBook = bids.length > 0 || asks.length > 0;

  const renderRows = (
    rows: BookRow[],
    maxQty: number,
    side: "ask" | "bid"
  ) =>
    rows.map((row, index) => {
      const depth = Math.min((row.qty / maxQty) * 100, 100);
      const isAsk = side === "ask";

      return (
        <div key={row.id ?? `${side}-${row.price}-${index}`} className={rowClass}>
          <div
            className={`absolute inset-y-[2px] right-3 rounded-sm ${
              isAsk ? "bg-brand-red/12" : "bg-brand-green/12"
            }`}
            style={{ width: `${depth}%` }}
          />
          <span
            className={`relative z-10 truncate font-mono ${
              isAsk ? "text-brand-red" : "text-brand-green"
            }`}
          >
            {formatPrice(row.price)}
          </span>
          <span className="relative z-10 truncate text-right font-mono text-text-light">
            {formatQty(row.qty)}
          </span>
        </div>
      );
    });

  return (
    <div className="flex h-full min-h-0 flex-col bg-dark-panel">
      <div className="flex items-center justify-between border-b border-dark-border/80 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-text-light">Order Book</h3>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-text-muted">
            {formatMarketSymbol(activeSymbol)} live depth
          </p>
        </div>
        <span
          className={`rounded px-2 py-1 text-[11px] font-semibold ${
            hasBook
              ? "bg-brand-green/10 text-brand-green"
              : "bg-brand-highlight text-text-muted"
          }`}
        >
          {hasBook ? "Live" : "Waiting"}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-dark-border/70 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
        <span>Price USDT</span>
        <span className="text-right">Qty {baseAsset}</span>
      </div>

      {!hasBook ? (
        <div className="grid flex-1 place-items-center px-6 text-center text-sm text-text-muted">
          Waiting for live order book data...
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto py-1 custom-scrollbar">
              {renderRows(visibleAsks, maxAskQty, "ask")}
            </div>
          </div>

          <div className="border-y border-dark-border/80 bg-dark-bg px-4 py-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-text-muted">
                  Last Price
                </div>
                <div className="font-mono text-2xl font-bold text-brand-green">
                  {formatPrice(currentPrice)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-text-muted">
                  Spread
                </div>
                <div className="font-mono text-xs text-text-light">
                  {formatPrice(spread)} ({spreadPercent.toFixed(3)}%)
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto py-1 custom-scrollbar">
              {renderRows(visibleBids, maxBidQty, "bid")}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Orderbook;
