"use client";

import React from "react";
import { useAppSelector } from "../../app/hooks";
import { formatPrice, formatPnL, getBaseAsset } from "../../utils/format";

const PortfolioPanel: React.FC = () => {
  const { positionQty, avgPrice, realizedPnL } = useAppSelector(
    (state) => state.trading
  );
  const currentPrice = useAppSelector((state) => state.market.currentPrice);
  const activeSymbol = useAppSelector((state) => state.market.activeSymbol);
  const baseAsset = getBaseAsset(activeSymbol);

  const unrealizedVal = positionQty * (currentPrice - avgPrice);
  const pnlObj = formatPnL(unrealizedVal);

  return (
    <div className="flex flex-col h-full bg-dark-panel border-l border-dark-border p-3">
      <h3 className="text-sm font-semibold text-text-light mb-3">Assets</h3>

      <div className="space-y-4">
        <div>
          <span className="text-xs text-text-muted block mb-1">
            Unrealized PNL
          </span>
          <span className={`text-lg font-mono font-bold ${pnlObj.colorClass}`}>
            {pnlObj.text} USDT
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-text-muted block">Position</span>
            <span className="text-sm text-text-light font-mono">
              {positionQty} {baseAsset}
            </span>
          </div>
          <div>
            <span className="text-xs text-text-muted block">Entry Price</span>
            <span className="text-sm text-text-light font-mono">
              {formatPrice(avgPrice)}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-dark-border">
          <div className="flex justify-between">
            <span className="text-xs text-text-muted">Realized PnL</span>
            <span
              className={`text-xs font-bold ${
                realizedPnL >= 0 ? "text-brand-green" : "text-brand-red"
              }`}
            >
              {formatPrice(realizedPnL)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioPanel;
