"use client";

import React from "react";
import { Eye, EyeOff, Landmark, Lock, Wallet2 } from "lucide-react";
import ProfileCard from "./ProfileCard";
import { convertDisplayValue } from "../../features/profile/profileSelectors";
import { formatCurrencyValue, formatPnL } from "../../utils/format";

type WalletOverviewProps = {
  summary: {
    totalBalance: number;
    accountBalance: number;
    availableBalance: number;
    lockedBalance: number;
    unrealizedPnl: number;
    realizedPnl: number;
    portfolioValue: number;
  };
  currency: "USDT" | "INR";
  hideBalance: boolean;
  onToggleBalance: () => void;
};

const formatDisplay = (
  value: number,
  currency: "USDT" | "INR",
  hideBalance: boolean
) => {
  if (hideBalance) return "******";
  const prefix = currency === "INR" ? "INR " : "";
  const suffix = currency === "USDT" ? " USDT" : "";
  return `${prefix}${formatCurrencyValue(
    convertDisplayValue(value, currency),
    currency
  )}${suffix}`;
};

const WalletOverview: React.FC<WalletOverviewProps> = ({
  summary,
  currency,
  hideBalance,
  onToggleBalance,
}) => {
  const unrealizedValue = convertDisplayValue(summary.unrealizedPnl, currency);
  const realizedValue = convertDisplayValue(summary.realizedPnl, currency);
  const unrealized = formatPnL(unrealizedValue);
  const realized = formatPnL(realizedValue);

  return (
    <ProfileCard
      title="Wallet Overview"
      subtitle="Live account value, available funds, and profit tracking."
      action={
        <button
          type="button"
          onClick={onToggleBalance}
          className="inline-flex items-center gap-2 rounded-full border border-[#2a2e39] bg-dark-bg px-3 py-2 text-xs text-text-muted transition hover:border-brand-green/40 hover:text-text-light"
        >
          {hideBalance ? <Eye size={14} /> : <EyeOff size={14} />}
          {hideBalance ? "Show balance" : "Hide balance"}
        </button>
      }
      className="overflow-hidden"
    >
      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[#2a2e39] bg-[radial-gradient(circle_at_top_left,rgba(22,184,128,0.18),transparent_45%),linear-gradient(135deg,#171b21,#111318)] p-6">
          <div className="flex items-center gap-3 text-text-muted">
            <Wallet2 size={16} />
            <span className="text-xs uppercase tracking-[0.24em]">
              Total Balance
            </span>
          </div>
          <div className="mt-4 text-4xl font-semibold tracking-tight text-text-light md:text-5xl">
            {formatDisplay(summary.totalBalance, currency, hideBalance)}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#2a2e39] bg-black/10 p-4">
              <div className="text-xs text-text-muted">Portfolio Value</div>
              <div className="mt-2 text-lg font-medium text-text-light">
                {formatDisplay(summary.portfolioValue, currency, hideBalance)}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a2e39] bg-black/10 p-4">
              <div className="text-xs text-text-muted">Cash Balance</div>
              <div className="mt-2 text-lg font-medium text-text-light">
                {formatDisplay(summary.accountBalance, currency, hideBalance)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#2a2e39] bg-dark-bg p-5">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Landmark size={14} />
              Available
            </div>
            <div className="mt-3 text-2xl font-semibold text-text-light">
              {formatDisplay(summary.availableBalance, currency, hideBalance)}
            </div>
          </div>
          <div className="rounded-2xl border border-[#2a2e39] bg-dark-bg p-5">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Lock size={14} />
              Locked
            </div>
            <div className="mt-3 text-2xl font-semibold text-text-light">
              {formatDisplay(summary.lockedBalance, currency, hideBalance)}
            </div>
          </div>
          <div className="rounded-2xl border border-[#2a2e39] bg-dark-bg p-5">
            <div className="text-xs text-text-muted">Unrealized PnL</div>
            <div className={`mt-3 text-2xl font-semibold ${unrealized.colorClass}`}>
              {hideBalance
                ? "******"
                : `${unrealized.text} ${currency === "INR" ? "INR" : "USDT"}`}
            </div>
          </div>
          <div className="rounded-2xl border border-[#2a2e39] bg-dark-bg p-5">
            <div className="text-xs text-text-muted">Realized PnL</div>
            <div className={`mt-3 text-2xl font-semibold ${realized.colorClass}`}>
              {hideBalance
                ? "******"
                : `${realized.text} ${currency === "INR" ? "INR" : "USDT"}`}
            </div>
          </div>
        </div>
      </div>
    </ProfileCard>
  );
};

export default WalletOverview;
