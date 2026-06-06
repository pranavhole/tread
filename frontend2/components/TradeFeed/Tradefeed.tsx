"use client";

import React from "react";
import { useAppSelector } from "../../app/hooks";
import { formatPrice, formatQty, formatTimestamp } from "../../utils/format";

const TradeFeed: React.FC = () => {
  const trades = useAppSelector((state) => state.trades.executedTrades);

  return (
    <div className="flex flex-col h-full bg-dark-panel border-r border-dark-border">
      <div className="p-2 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-text-light">Recent Trades</h3>
      </div>

      <div className="flex justify-between px-2 py-1 text-xs text-text-muted">
        <span className="w-1/3">Time</span>
        <span className="w-1/3 text-right">Price</span>
        <span className="w-1/3 text-right">Qty</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {trades.map((trade, idx) => {
          const isBuy = trade.side ? trade.side === "buy" : true;
          return (
            <div
              key={`${trade.timestamp}-${idx}`}
              className="flex justify-between px-2 py-[2px] text-xs hover:bg-brand-highlight/30"
            >
              <span className="w-1/3 text-text-muted">
                {formatTimestamp(trade.timestamp)}
              </span>
              <span
                className={`w-1/3 text-right font-mono ${
                  isBuy ? "text-brand-green" : "text-brand-red"
                }`}
              >
                {formatPrice(trade.price)}
              </span>
              <span className="w-1/3 text-right text-text-light font-mono">
                {formatQty(trade.qty)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TradeFeed;
