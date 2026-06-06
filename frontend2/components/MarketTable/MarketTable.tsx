"use client";

import React, { useMemo } from "react";
import { useAppSelector } from "../../app/hooks";
import MarketTableToolbar from "./MarketTableToolbar";
import MarketTableRow from "./MarketTableRow";

const MarketTable: React.FC = () => {
  const { symbols, search, sort, changes, volumes } = useAppSelector((state) => state.marketDirectory);

  const visibleSymbols = useMemo(() => {
    const query = search.trim().toUpperCase();
    const filtered = query
      ? symbols.filter((symbol) => symbol.includes(query))
      : symbols.slice();

    return filtered.sort((left, right) => {
      if (sort === "symbol") return left.localeCompare(right);
      if (sort === "gainers") return (changes[right] ?? 0) - (changes[left] ?? 0);
      if (sort === "losers") return (changes[left] ?? 0) - (changes[right] ?? 0);
      return (volumes[right] ?? 0) - (volumes[left] ?? 0);
    });
  }, [changes, search, sort, symbols, volumes]);

  return (
    <div className="flex h-full flex-col bg-dark-bg">
      <div className="border-b border-dark-border/80 px-4 py-5">
        <h1 className="text-2xl font-semibold text-text-light">Markets</h1>
        <p className="mt-1 text-sm text-text-muted">
          Live top 100 USDT pairs with real-time price, 24h move, and volume.
        </p>
      </div>

      <MarketTableToolbar />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto custom-scrollbar">
          <div className="market-table-header grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_72px] gap-4 border-b border-dark-border bg-dark-panel px-4 py-3 text-xs uppercase tracking-wide text-text-muted">
            <span>Market</span>
            <span>Price</span>
            <span>24h</span>
            <span className="text-right">Volume</span>
          </div>

          {visibleSymbols.length === 0 ? (
            <div className="grid min-h-[320px] place-items-center px-6 text-center text-sm text-text-muted">
              Waiting for live market quotes...
            </div>
          ) : (
            visibleSymbols.map((symbol) => (
              <MarketTableRow key={symbol} symbol={symbol} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketTable;
