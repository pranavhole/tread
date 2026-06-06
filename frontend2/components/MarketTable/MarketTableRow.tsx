"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../../app/hooks";
import {
  formatCompactNumber,
  formatMarketSymbol,
  formatPercent,
  formatPrice,
  getBaseAsset,
} from "../../utils/format";

const MarketTableRow = memo(function MarketTableRow({ symbol }: { symbol: string }) {
  const router = useRouter();
  const price = useAppSelector((state) => state.marketDirectory.prices[symbol] ?? 0);
  const change = useAppSelector((state) => state.marketDirectory.changes[symbol] ?? 0);
  const volume = useAppSelector((state) => state.marketDirectory.volumes[symbol] ?? 0);
  const previousPrice = useRef(price);
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    if (!previousPrice.current || previousPrice.current === price) {
      previousPrice.current = price;
      return;
    }

    setFlashClass(price > previousPrice.current ? "flash-up" : "flash-down");
    previousPrice.current = price;
    const timeout = window.setTimeout(() => setFlashClass(""), 450);
    return () => window.clearTimeout(timeout);
  }, [price]);

  const changeClass = change >= 0 ? "text-brand-green" : "text-brand-red";

  return (
    <button
      type="button"
      onClick={() => router.push(`/trade/${symbol}`)}
      className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_72px] items-center gap-4 border-b border-dark-border/40 px-4 py-3 text-left transition-colors hover:bg-brand-highlight/50"
    >
      <div>
        <div className="font-medium text-text-light">{formatMarketSymbol(symbol)}</div>
        <div className="mt-1 text-xs uppercase tracking-wide text-text-muted">{getBaseAsset(symbol)}</div>
      </div>

      <div className={`font-mono text-sm text-text-light transition-colors ${flashClass}`}>
        ${formatPrice(price)}
      </div>

      <div className={`font-mono text-sm ${changeClass}`}>
        {formatPercent(change)}
      </div>

      <div className="text-right font-mono text-sm text-text-muted">
        {formatCompactNumber(volume)}
      </div>
    </button>
  );
});

export default MarketTableRow;
