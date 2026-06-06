"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchUserProfile } from "../../features/auth/authSlice";
import { loadOpenOrders } from "../../features/orders/orderUpdatesSlice";
import { loadTrades } from "../../features/trades/tradesSlice";
import { loadTransactions } from "../../features/transactions/transactionsSlice";
import { initializeSocketListeners } from "../../services/socketListners";

export default function AppInitializer() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const userId = user?.id;

  useEffect(() => {
    if (pathname === "/login") return;
    initializeSocketListeners(dispatch, userId);
  }, [dispatch, pathname, userId]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    dispatch(loadOpenOrders());
    dispatch(loadTrades());
    dispatch(loadTransactions());
  }, [dispatch, isAuthenticated, userId]);

  return null;
}
