"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import ProtectedShell from "../../../components/ProtectedShell/ProtectedShell";
import Dashboard from "../../../components/Dashboard/Dashboard";
import { useAppDispatch } from "../../../app/hooks";
import { setActiveSymbol } from "../../../features/market/marketSlice";
import { resetOrderbook } from "../../../features/orderbook/orderbookSlice";
import { resetTrades } from "../../../features/trades/tradesSlice";
import { getSocket } from "../../../services/socket";

export default function TradeSymbolPage() {
  const dispatch = useAppDispatch();
  const params = useParams<{ symbol: string }>();
  const symbol = (params?.symbol ?? "BTCUSDT").toUpperCase();

  useEffect(() => {
    dispatch(setActiveSymbol(symbol));
    dispatch(resetOrderbook());
    dispatch(resetTrades());
    getSocket()?.emit("market:watch", symbol);
  }, [dispatch, symbol]);

  return (
    <ProtectedShell>
      <Dashboard />
    </ProtectedShell>
  );
}
