"use client";

import React from "react";
import { Search } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSearch, setSort, type MarketSort } from "../../features/marketDirectory/marketDirectorySlice";

const MarketTableToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { search, sort } = useAppSelector((state) => state.marketDirectory);

  return (
    <div className="flex flex-col gap-3 border-b border-dark-border/80 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-3 text-text-muted" size={16} />
        <input
          value={search}
          onChange={(event) => dispatch(setSearch(event.target.value))}
          placeholder="Search BTC, ETH, SOL..."
          className="h-10 w-full rounded-lg border border-dark-border bg-dark-bg pl-9 pr-3 text-sm text-text-light outline-none placeholder:text-text-muted focus:border-brand-green"
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-text-muted">Sort</span>
        <select
          value={sort}
          onChange={(event) => dispatch(setSort(event.target.value as MarketSort))}
          className="h-10 rounded-lg border border-dark-border bg-dark-bg px-3 text-sm text-text-light outline-none"
        >
          <option value="volume">Volume</option>
          <option value="gainers">Gainers</option>
          <option value="losers">Losers</option>
          <option value="symbol">Symbol</option>
        </select>
      </div>
    </div>
  );
};

export default MarketTableToolbar;
