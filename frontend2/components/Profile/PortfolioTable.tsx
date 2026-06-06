"use client";

import React from "react";
import { ArrowDownUp } from "lucide-react";
import ProfileCard from "./ProfileCard";
import { convertDisplayValue } from "../../features/profile/profileSelectors";
import {
  formatCurrencyValue,
  formatMarketSymbol,
  formatPercent,
  formatQty,
} from "../../utils/format";

type PositionRow = {
  id: string;
  symbol: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  percentChange: number;
  marketValue: number;
};

type PortfolioTableProps = {
  rows: PositionRow[];
  currency: "USDT" | "INR";
  hideSmallBalances: boolean;
  sortKey: "pnl" | "value";
  onSortChange: (value: "pnl" | "value") => void;
};

const PortfolioTable: React.FC<PortfolioTableProps> = ({
  rows,
  currency,
  hideSmallBalances,
  sortKey,
  onSortChange,
}) => {
  const visibleRows = hideSmallBalances
    ? rows.filter((row) => row.marketValue >= 10)
    : rows;

  return (
    <ProfileCard
      title="Portfolio / Positions"
      subtitle="Live mark price, size, and unrealized return for each open position."
      action={
        <button
          type="button"
          onClick={() => onSortChange(sortKey === "pnl" ? "value" : "pnl")}
          className="inline-flex items-center gap-2 rounded-full border border-[#2a2e39] bg-dark-bg px-3 py-2 text-xs text-text-muted transition hover:text-text-light"
        >
          <ArrowDownUp size={14} />
          Sort by {sortKey === "pnl" ? "value" : "PnL"}
        </button>
      }
      className="overflow-hidden"
    >
      {visibleRows.length === 0 ? (
        <div className="grid min-h-[280px] place-items-center px-6 text-center text-sm text-text-muted">
          No positions yet. Execute a trade to start building your portfolio.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-dark-bg/70 text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-5 py-4">Symbol</th>
                <th className="px-5 py-4 text-right">Quantity</th>
                <th className="px-5 py-4 text-right">Average Price</th>
                <th className="px-5 py-4 text-right">Current Price</th>
                <th className="px-5 py-4 text-right">Value</th>
                <th className="px-5 py-4 text-right">Unrealized PnL</th>
                <th className="px-5 py-4 text-right">% Change</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[#2a2e39] transition hover:bg-brand-highlight/30"
                >
                  <td className="px-5 py-4 text-sm font-medium text-text-light">
                    {formatMarketSymbol(row.symbol)}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-sm text-text-light">
                    {formatQty(row.qty)}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-sm text-text-muted">
                    {formatCurrencyValue(
                      convertDisplayValue(row.avgPrice, currency),
                      currency
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-sm text-text-light">
                    {formatCurrencyValue(
                      convertDisplayValue(row.currentPrice, currency),
                      currency
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-sm text-text-light">
                    {formatCurrencyValue(
                      convertDisplayValue(row.marketValue, currency),
                      currency
                    )}
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-mono text-sm ${
                      row.unrealizedPnl >= 0
                        ? "text-brand-green"
                        : "text-brand-red"
                    }`}
                  >
                    {row.unrealizedPnl >= 0 ? "+" : ""}
                    {formatCurrencyValue(
                      convertDisplayValue(row.unrealizedPnl, currency),
                      currency
                    )}
                  </td>
                  <td
                    className={`px-5 py-4 text-right text-sm font-medium ${
                      row.percentChange >= 0
                        ? "text-brand-green"
                        : "text-brand-red"
                    }`}
                  >
                    {formatPercent(row.percentChange)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProfileCard>
  );
};

export default PortfolioTable;
