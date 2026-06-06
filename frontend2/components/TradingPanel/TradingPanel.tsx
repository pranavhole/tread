"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { selectWalletSummary } from "../../features/profile/profileSelectors";
import { fetchUserProfile } from "../../features/auth/authSlice";
import { cancelOpenOrders, loadOpenOrders } from "../../features/orders/orderUpdatesSlice";
import { loadTrades } from "../../features/trades/tradesSlice";
import { loadTransactions } from "../../features/transactions/transactionsSlice";
import { placeOrder } from "../../features/trading/tradingSlice";
import { formatMarketSymbol, formatPrice, getBaseAsset } from "../../utils/format";

const TradingPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentPrice = useAppSelector((state) => state.market.currentPrice);
  const activeSymbol = useAppSelector((state) => state.market.activeSymbol);
  const summary = useAppSelector(selectWalletSummary);
  const openOrders = useAppSelector((state) => state.orders.openOrders);
  const activePosition = useAppSelector((state) =>
    state.positions.items.find((position) => position.symbol === activeSymbol)
  );
  const orderStatus = useAppSelector((state) => state.trading.status);
  const baseAsset = getBaseAsset(activeSymbol);

  const [activeTab, setActiveTab] = useState<"MARKET" | "LIMIT">("MARKET");
  const [qty, setQty] = useState("0.1");
  const [price, setPrice] = useState(formatPrice(currentPrice));
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<{
    side: string;
    type: string;
  } | null>(null);
  const [orderError, setOrderError] = useState("");
  const [isClosingOrders, setIsClosingOrders] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showSuccess) {
      timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showSuccess]);

  const handleOrder = async (side: "BUY" | "SELL") => {
    try {
      setOrderError("");
      const parsedQty = parseFloat(qty);
      const parsedPrice = activeTab === "LIMIT" ? parseFloat(price) : currentPrice;
      const estimatedCost = parsedQty * parsedPrice;

      if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
        setOrderError("Enter a valid amount.");
        return;
      }

      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        setOrderError("Enter a valid price.");
        return;
      }

      if (side === "BUY" && estimatedCost > summary.availableBalance) {
        setOrderError(
          summary.lockedBalance > 0
            ? "Funds are reserved in open BUY orders. Close open orders and try again."
            : "Insufficient available balance."
        );
        return;
      }

      if (side === "SELL" && parsedQty > (activePosition?.qty ?? 0)) {
        setOrderError(`Insufficient ${baseAsset} position.`);
        return;
      }

      await dispatch(
        placeOrder({
          type: activeTab,
          side,
          symbol: activeSymbol,
          qty: parsedQty,
          price: activeTab === "LIMIT" ? parseFloat(price) : undefined,
        })
      ).unwrap();

      await Promise.all([
        dispatch(fetchUserProfile()),
        dispatch(loadOpenOrders()),
        dispatch(loadTrades()),
        dispatch(loadTransactions()),
      ]);
      window.setTimeout(() => {
        dispatch(fetchUserProfile());
        dispatch(loadOpenOrders());
        dispatch(loadTrades());
        dispatch(loadTransactions());
      }, 1200);

      setLastOrder({ side, type: activeTab });
      setShowSuccess(true);
    } catch (error) {
      console.error("Order failed via Redux:", error);
      setOrderError(error instanceof Error ? error.message : "Order failed.");
    }
  };

  const handleCloseOpenOrders = async () => {
    try {
      setOrderError("");
      setIsClosingOrders(true);
      await dispatch(cancelOpenOrders()).unwrap();
      await Promise.all([
        dispatch(fetchUserProfile()),
        dispatch(loadOpenOrders()),
        dispatch(loadTrades()),
        dispatch(loadTransactions()),
      ]);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "Failed to close open orders.");
    } finally {
      setIsClosingOrders(false);
    }
  };

  const btnClass =
    "h-11 rounded text-sm font-bold text-dark-bg transition-transform active:scale-95";

  return (
    <div className="relative flex h-full flex-col gap-4 overflow-hidden bg-dark-panel p-4">
      {showSuccess && lastOrder && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-dark-panel/90 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center rounded-md border border-dark-border bg-dark-bg p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/20 text-brand-green">
              <Check size={24} />
            </div>
            <h4 className="text-lg font-bold text-text-light">
              Order Submitted
            </h4>
            <p className="mt-1 text-center text-sm text-text-muted">
              {lastOrder.side} {lastOrder.type} <br />
              <span className="font-mono text-text-light">{qty} {baseAsset}</span>
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-text-light">Trade {formatMarketSymbol(activeSymbol)}</h3>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-text-muted">
          Simulated balance
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-md bg-dark-bg p-1">
        {["LIMIT", "MARKET"].map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type as any)}
            className={`h-9 rounded text-xs font-medium transition-colors ${
              activeTab === type
                ? "bg-dark-panel text-text-light shadow"
                : "text-text-muted hover:text-text-light"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {activeTab === "LIMIT" && (
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Price</label>
            <div className="flex h-11 items-center rounded-md border border-dark-border bg-dark-bg px-3">
              <span className="text-xs text-text-muted">USDT</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-transparent p-2 text-right text-sm text-text-light outline-none"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-text-muted">Amount</label>
          <div className="flex h-11 items-center rounded-md border border-dark-border bg-dark-bg px-3">
            <span className="text-xs text-text-muted">{baseAsset}</span>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-transparent p-2 text-right text-sm text-text-light outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => handleOrder("BUY")}
          disabled={orderStatus === "loading"}
          className={`${btnClass} bg-brand-green hover:brightness-110`}
        >
          Buy {baseAsset}
        </button>
        <button
          onClick={() => handleOrder("SELL")}
          disabled={orderStatus === "loading"}
          className={`${btnClass} bg-brand-red hover:brightness-110`}
        >
          Sell {baseAsset}
        </button>
      </div>

      {orderError && <p className="text-xs text-brand-red">{orderError}</p>}

      {summary.lockedBalance > 0 && (
        <button
          type="button"
          onClick={handleCloseOpenOrders}
          disabled={isClosingOrders || openOrders.length === 0}
          className="h-9 rounded border border-brand-red/40 bg-brand-red/10 text-xs font-semibold text-brand-red transition hover:bg-brand-red/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isClosingOrders ? "Closing open orders..." : "Close Open Orders"}
        </button>
      )}

      <div className="mt-auto rounded-md border border-dark-border bg-dark-bg px-3 py-2">
        <div className="flex justify-between text-xs text-text-muted">
          <span>Available</span>
          <span className="font-mono text-text-light">
            {formatPrice(summary.availableBalance)} USDT
          </span>
        </div>
        {summary.lockedBalance > 0 && (
          <div className="mt-1 flex justify-between text-xs text-text-muted">
            <span>Reserved</span>
            <span className="font-mono text-brand-red">
              {formatPrice(summary.lockedBalance)} USDT
            </span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-xs text-text-muted">
          <span>Mark</span>
          <span className="font-mono text-text-light">
            {formatPrice(currentPrice)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TradingPanel;
