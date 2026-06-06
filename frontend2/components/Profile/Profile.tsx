"use client";

import React from "react";
import { useSubscription } from "@apollo/client/react";
import { RefreshCcw, WalletCards } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchUserProfile } from "../../features/auth/authSlice";
import {
  convertDisplayValue,
  selectOrderBuckets,
  selectPerformanceStats,
  selectPortfolioSeries,
  selectPositionsWithMarketData,
  selectProfileCsvRows,
  selectProfileUser,
  selectTradeRows,
  selectTransactions,
  selectWalletSummary,
} from "../../features/profile/profileSelectors";
import {
  cancelOpenOrders,
  loadOpenOrders,
  processOrderUpdate,
} from "../../features/orders/orderUpdatesSlice";
import { loadTrades } from "../../features/trades/tradesSlice";
import { loadTransactions } from "../../features/transactions/transactionsSlice";
import { SUBSCRIPTIONS } from "../../services/graphql/query";
import type { Order } from "../../features/profile/profileTypes";
import WalletOverview from "./WalletOverview";
import PortfolioTable from "./PortfolioTable";
import OrdersSection from "./OrdersSection";
import TransactionsTable from "./TransactionsTable";
import PerformanceStats from "./PerformanceStats";
import AccountInfo from "./AccountInfo";

const REFRESH_INTERVAL_MS = 30_000;

const createCsvBlob = (
  rows: Array<Record<string, string | number | null | undefined>>
) => {
  if (rows.length === 0) {
    return null;
  }

  const columns = Object.keys(rows[0]);
  const csvLines = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => JSON.stringify(row[column] ?? "")).join(",")
    ),
  ];

  return new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
};

const Profile: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectProfileUser);
  const summary = useAppSelector(selectWalletSummary);
  const positions = useAppSelector(selectPositionsWithMarketData);
  const orderBuckets = useAppSelector(selectOrderBuckets);
  const tradeRows = useAppSelector(selectTradeRows);
  const transactions = useAppSelector(selectTransactions);
  const performanceStats = useAppSelector(selectPerformanceStats);
  const portfolioSeries = useAppSelector(selectPortfolioSeries);
  const csvRows = useAppSelector(selectProfileCsvRows);

  const [hideBalance, setHideBalance] = React.useState(false);
  const [hideSmallBalances, setHideSmallBalances] = React.useState(false);
  const [currency, setCurrency] = React.useState<"USDT" | "INR">("USDT");
  const [sortKey, setSortKey] = React.useState<"pnl" | "value">("pnl");
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [isClosingOpenOrders, setIsClosingOpenOrders] = React.useState(false);

  const sortedPositions = React.useMemo(() => {
    const rows = positions.slice();
    rows.sort((left, right) =>
      sortKey === "pnl"
        ? right.unrealizedPnl - left.unrealizedPnl
        : right.marketValue - left.marketValue
    );
    return rows;
  }, [positions, sortKey]);

  const refreshProfileData = React.useCallback(() => {
    dispatch(fetchUserProfile());
    dispatch(loadOpenOrders());
    dispatch(loadTrades());
    dispatch(loadTransactions());
  }, [dispatch]);

  React.useEffect(() => {
    refreshProfileData();
  }, [refreshProfileData]);

  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = window.setInterval(() => {
      refreshProfileData();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [autoRefresh, refreshProfileData]);

  useSubscription<{ orderUpdated: Order }>(SUBSCRIPTIONS.ORDER_UPDATED, {
    onData: ({ data }) => {
      const order = data.data?.orderUpdated;
      if (!order) return;

      dispatch(processOrderUpdate(order));
      dispatch(fetchUserProfile());
      dispatch(loadTrades());
      dispatch(loadTransactions());
    },
  });

  const exportTrades = React.useCallback(() => {
    const blob = createCsvBlob(csvRows);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "trade-history.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [csvRows]);

  const closeOpenOrders = React.useCallback(async () => {
    setIsClosingOpenOrders(true);
    try {
      await dispatch(cancelOpenOrders()).unwrap();
      refreshProfileData();
    } finally {
      setIsClosingOpenOrders(false);
    }
  }, [dispatch, refreshProfileData]);

  const convertedTotal = convertDisplayValue(summary.totalBalance, currency);

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(22,184,128,0.12),transparent_25%),linear-gradient(180deg,#121417,#0f1115)] text-text-light">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-[#2a2e39] bg-dark-panel/90 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-green/15 text-brand-green">
              <WalletCards size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-text-light">
                Asset Dashboard
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                {user?.email ?? "Loading account..."} - Estimated equity{" "}
                {currency === "INR" ? "INR " : ""}
                {hideBalance
                  ? "******"
                  : convertedTotal.toLocaleString(
                      currency === "INR" ? "en-IN" : "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                {currency === "USDT" ? " USDT" : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-[#2a2e39] bg-dark-bg p-1 text-xs">
              <button
                type="button"
                onClick={() => setCurrency("USDT")}
                className={`rounded-full px-3 py-2 transition ${
                  currency === "USDT"
                    ? "bg-brand-green/15 text-brand-green"
                    : "text-text-muted hover:text-text-light"
                }`}
              >
                USDT
              </button>
              <button
                type="button"
                onClick={() => setCurrency("INR")}
                className={`rounded-full px-3 py-2 transition ${
                  currency === "INR"
                    ? "bg-brand-green/15 text-brand-green"
                    : "text-text-muted hover:text-text-light"
                }`}
              >
                INR
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHideSmallBalances((value) => !value)}
              className={`rounded-full border px-3 py-2 text-xs transition ${
                hideSmallBalances
                  ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
                  : "border-[#2a2e39] bg-dark-bg text-text-muted hover:text-text-light"
              }`}
            >
              Hide small balances
            </button>

            <button
              type="button"
              onClick={() => setAutoRefresh((value) => !value)}
              className={`rounded-full border px-3 py-2 text-xs transition ${
                autoRefresh
                  ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
                  : "border-[#2a2e39] bg-dark-bg text-text-muted hover:text-text-light"
              }`}
            >
              Auto-refresh {autoRefresh ? "on" : "off"}
            </button>

            <button
              type="button"
              onClick={refreshProfileData}
              className="inline-flex items-center gap-2 rounded-full border border-[#2a2e39] bg-dark-bg px-3 py-2 text-xs text-text-muted transition hover:text-text-light"
            >
              <RefreshCcw size={14} />
              Refresh now
            </button>
          </div>
        </div>

        <WalletOverview
          summary={summary}
          currency={currency}
          hideBalance={hideBalance}
          onToggleBalance={() => setHideBalance((value) => !value)}
        />

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
          <PortfolioTable
            rows={sortedPositions}
            currency={currency}
            hideSmallBalances={hideSmallBalances}
            sortKey={sortKey}
            onSortChange={setSortKey}
          />
          <AccountInfo user={user} />
        </div>

        <OrdersSection
          openOrders={orderBuckets.openOrders}
          orderHistory={orderBuckets.history}
          tradeHistory={tradeRows}
          currency={currency}
          onExportCsv={exportTrades}
          onCloseOpenOrders={closeOpenOrders}
          isClosingOpenOrders={isClosingOpenOrders}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
          <TransactionsTable rows={transactions} currency={currency} />
          <PerformanceStats
            stats={performanceStats}
            portfolioSeries={portfolioSeries}
            currency={currency}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
