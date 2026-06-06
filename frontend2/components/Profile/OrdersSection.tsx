"use client";

import React from "react";
import ProfileCard from "./ProfileCard";
import { convertDisplayValue } from "../../features/profile/profileSelectors";
import {
  formatCurrencyValue,
  formatDateTime,
  formatMarketSymbol,
  formatQty,
} from "../../utils/format";
import type { Order } from "../../features/profile/profileTypes";

type TradeRow = {
  id: string;
  symbol: string;
  type: string;
  side: string;
  status: string;
  price: number;
  qty: number;
  fees: number;
  realizedPnl: number;
  createdAt: string;
};

type OrdersSectionProps = {
  openOrders: Order[];
  orderHistory: Order[];
  tradeHistory: TradeRow[];
  currency: "USDT" | "INR";
  onExportCsv: () => void;
  onCloseOpenOrders: () => void;
  isClosingOpenOrders: boolean;
};

type TabKey = "open" | "orders" | "trades";

const tabClass = (active: boolean) =>
  `rounded-full px-3 py-2 text-xs font-medium transition ${
    active
      ? "bg-brand-green/15 text-brand-green"
      : "text-text-muted hover:bg-brand-highlight/40 hover:text-text-light"
  }`;

const OrderTable: React.FC<{
  orders: Order[];
  currency: "USDT" | "INR";
}> = ({ orders, currency }) => {
  if (orders.length === 0) {
    return (
      <div className="grid min-h-[280px] place-items-center px-6 text-center text-sm text-text-muted">
        No orders in this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-dark-bg/70 text-left text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-5 py-4">Symbol</th>
            <th className="px-5 py-4">Type</th>
            <th className="px-5 py-4">Side</th>
            <th className="px-5 py-4 text-right">Price</th>
            <th className="px-5 py-4 text-right">Quantity</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-t border-[#2a2e39] transition hover:bg-brand-highlight/30"
            >
              <td className="px-5 py-4 text-sm text-text-light">
                {formatMarketSymbol(order.symbol ?? "BTCUSDT")}
              </td>
              <td className="px-5 py-4 text-sm text-text-muted">{order.type}</td>
              <td
                className={`px-5 py-4 text-sm font-medium ${
                  order.side === "BUY" ? "text-brand-green" : "text-brand-red"
                }`}
              >
                {order.side}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm text-text-light">
                {formatCurrencyValue(
                  convertDisplayValue(order.price, currency),
                  currency
                )}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm text-text-light">
                {formatQty(order.qty)}
              </td>
              <td className="px-5 py-4 text-sm text-text-muted">{order.status}</td>
              <td className="px-5 py-4 text-right text-sm text-text-muted">
                {formatDateTime(order.updatedAt ?? order.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TradeTable: React.FC<{
  rows: TradeRow[];
  currency: "USDT" | "INR";
}> = ({ rows, currency }) => {
  if (rows.length === 0) {
    return (
      <div className="grid min-h-[280px] place-items-center px-6 text-center text-sm text-text-muted">
        No trade history yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-dark-bg/70 text-left text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-5 py-4">Symbol</th>
            <th className="px-5 py-4">Type</th>
            <th className="px-5 py-4">Side</th>
            <th className="px-5 py-4 text-right">Price</th>
            <th className="px-5 py-4 text-right">Quantity</th>
            <th className="px-5 py-4 text-right">Fees</th>
            <th className="px-5 py-4 text-right">PnL</th>
            <th className="px-5 py-4 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((trade) => (
            <tr
              key={trade.id}
              className="border-t border-[#2a2e39] transition hover:bg-brand-highlight/30"
            >
              <td className="px-5 py-4 text-sm text-text-light">
                {formatMarketSymbol(trade.symbol)}
              </td>
              <td className="px-5 py-4 text-sm text-text-muted">{trade.type}</td>
              <td
                className={`px-5 py-4 text-sm font-medium ${
                  trade.side === "BUY" ? "text-brand-green" : "text-brand-red"
                }`}
              >
                {trade.side}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm text-text-light">
                {formatCurrencyValue(
                  convertDisplayValue(trade.price, currency),
                  currency
                )}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm text-text-light">
                {formatQty(trade.qty)}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm text-text-muted">
                {formatCurrencyValue(
                  convertDisplayValue(trade.fees, currency),
                  currency
                )}
              </td>
              <td
                className={`px-5 py-4 text-right font-mono text-sm ${
                  trade.realizedPnl >= 0 ? "text-brand-green" : "text-brand-red"
                }`}
              >
                {trade.realizedPnl >= 0 ? "+" : ""}
                {formatCurrencyValue(
                  convertDisplayValue(trade.realizedPnl, currency),
                  currency
                )}
              </td>
              <td className="px-5 py-4 text-right text-sm text-text-muted">
                {formatDateTime(trade.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const OrdersSection: React.FC<OrdersSectionProps> = ({
  openOrders,
  orderHistory,
  tradeHistory,
  currency,
  onExportCsv,
  onCloseOpenOrders,
  isClosingOpenOrders,
}) => {
  const [activeTab, setActiveTab] = React.useState<TabKey>("open");

  return (
    <ProfileCard
      title="Order History"
      subtitle="Track open orders, fills, and completed trades in real time."
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="rounded-full border border-[#2a2e39] bg-dark-bg px-3 py-2 text-xs text-text-muted transition hover:text-text-light"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={onCloseOpenOrders}
            disabled={openOrders.length === 0 || isClosingOpenOrders}
            className="rounded-full border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs font-medium text-brand-red transition hover:bg-brand-red/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isClosingOpenOrders ? "Closing..." : "Close Open Orders"}
          </button>
          <div className="flex items-center rounded-full border border-[#2a2e39] bg-dark-bg p-1">
            <button
              type="button"
              className={tabClass(activeTab === "open")}
              onClick={() => setActiveTab("open")}
            >
              Open Orders
            </button>
            <button
              type="button"
              className={tabClass(activeTab === "orders")}
              onClick={() => setActiveTab("orders")}
            >
              Order History
            </button>
            <button
              type="button"
              className={tabClass(activeTab === "trades")}
              onClick={() => setActiveTab("trades")}
            >
              Trade History
            </button>
          </div>
        </div>
      }
      className="overflow-hidden"
    >
      {activeTab === "open" ? (
        <OrderTable orders={openOrders} currency={currency} />
      ) : activeTab === "orders" ? (
        <OrderTable orders={orderHistory} currency={currency} />
      ) : (
        <TradeTable rows={tradeHistory} currency={currency} />
      )}
    </ProfileCard>
  );
};

export default OrdersSection;
