"use client";

import React from "react";
import { Trophy, TrendingDown, TrendingUp, Zap } from "lucide-react";
import ProfileCard from "./ProfileCard";
import { convertDisplayValue } from "../../features/profile/profileSelectors";
import { formatCurrencyValue, formatPercent } from "../../utils/format";

type PerformanceStatsProps = {
  stats: {
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    bestTrade: { realizedPnl: number } | null;
    worstTrade: { realizedPnl: number } | null;
  };
  portfolioSeries: number[];
  currency: "USDT" | "INR";
};

const buildPath = (series: number[]) => {
  if (series.length <= 1) return "";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  return series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
};

const PerformanceStats: React.FC<PerformanceStatsProps> = ({
  stats,
  portfolioSeries,
  currency,
}) => {
  const series = portfolioSeries.length > 1 ? portfolioSeries : [0, 0];
  const path = buildPath(series);

  const statCards = [
    {
      icon: Zap,
      label: "Total Trades",
      value: String(stats.totalTrades),
    },
    {
      icon: Trophy,
      label: "Win Rate",
      value: formatPercent(stats.winRate),
    },
    {
      icon: TrendingUp,
      label: "Best Trade",
      value: stats.bestTrade
        ? `${stats.bestTrade.realizedPnl >= 0 ? "+" : ""}${formatCurrencyValue(
            convertDisplayValue(stats.bestTrade.realizedPnl, currency),
            currency
          )}`
        : "--",
    },
    {
      icon: TrendingDown,
      label: "Worst Trade",
      value: stats.worstTrade
        ? `${stats.worstTrade.realizedPnl >= 0 ? "+" : ""}${formatCurrencyValue(
            convertDisplayValue(stats.worstTrade.realizedPnl, currency),
            currency
          )}`
        : "--",
    },
  ];

  return (
    <ProfileCard
      title="Performance Analytics"
      subtitle="Trade count, hit rate, and an equity curve derived from account activity."
      className="overflow-hidden"
    >
      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[#2a2e39] bg-dark-bg p-5"
            >
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <card.icon size={14} />
                {card.label}
              </div>
              <div className="mt-3 text-2xl font-semibold text-text-light">
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#2a2e39] bg-dark-bg p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Portfolio Value Over Time
          </div>
          <div className="mt-3 text-2xl font-semibold text-text-light">
            {stats.totalPnl >= 0 ? "+" : ""}
            {formatCurrencyValue(
              convertDisplayValue(stats.totalPnl, currency),
              currency
            )}
          </div>
          <div className="mt-5 h-40 rounded-xl border border-[#2a2e39] bg-[linear-gradient(180deg,rgba(22,184,128,0.12),rgba(22,184,128,0.02))] p-4">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <path
                d={path}
                fill="none"
                stroke="#16b880"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>
      </div>
    </ProfileCard>
  );
};

export default PerformanceStats;
