"use client";

import React from "react";
import { ChevronDown, Bell, LogOut } from "lucide-react";
import { useAppSelector } from "../../app/hooks";
import { selectWalletSummary } from "../../features/profile/profileSelectors";
import { formatMarketSymbol, formatPercent, formatPrice } from "../../utils/format";

const Topbar: React.FC = () => {
  const { currentPrice, activeSymbol } = useAppSelector((state) => state.market);
  const currentChange = useAppSelector(
    (state) => state.marketDirectory.changes[activeSymbol] ?? 0
  );
  const summary = useAppSelector(selectWalletSummary);
  const priceColor = currentChange >= 0 ? "text-brand-green" : "text-brand-red";

  return (
    <div className="flex items-center justify-between h-12 px-4 border-b bg-dark-panel border-dark-border">
      {/* Left: Symbol & Price */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center p-1 cursor-pointer hover:bg-brand-highlight rounded-md transition-colors">
          <span className="text-lg font-bold text-text-light mr-1">
            {formatMarketSymbol(activeSymbol)}
          </span>
          <ChevronDown size={16} className="text-text-muted" />
        </div>

        <div className="flex items-center space-x-2">
          <span className={`text-lg font-mono font-medium ${priceColor}`}>
            {formatPrice(currentPrice)}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${currentChange >= 0 ? "text-brand-green bg-brand-green/10" : "text-brand-red bg-brand-red/10"}`}>
            {formatPercent(currentChange)}
          </span>
        </div>
      </div>

      {/* Right: Balance & Actions */}
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex text-sm text-text-muted bg-dark-bg px-3 py-1 rounded-full border border-dark-border">
          <span className="mr-2">Available:</span>
          <span className="text-text-light font-semibold">
            ${formatPrice(summary.availableBalance)}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-text-muted">
          <button className="hover:text-text-light transition-colors">
            <Bell size={18} />
          </button>
          <button
            className="hover:text-brand-red transition-colors"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.clear();
                window.location.href = "/";
              }
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
