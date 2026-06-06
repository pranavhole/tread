"use client";

import React, { useEffect } from "react";
import { useSubscription } from "@apollo/client/react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { processOrderUpdate, loadOpenOrders } from "../../features/orders/orderUpdatesSlice";
import type { Order } from "../../features/profile/profileTypes";
import { SUBSCRIPTIONS } from "../../services/graphql/query";
import { formatPrice } from "../../utils/format";

const OrderUpdates: React.FC = () => {
  const dispatch = useAppDispatch();
  const updates = useAppSelector((state) => state.orders.openOrders);

  useEffect(() => {
    dispatch(loadOpenOrders());
  }, [dispatch]);

  useSubscription<{ orderUpdated: Order }>(SUBSCRIPTIONS.ORDER_UPDATED, {
    onData: ({ data }) => {
      if (data?.data?.orderUpdated) {
        dispatch(processOrderUpdate(data.data.orderUpdated));
      }
    },
  });

  return (
    <div className="flex flex-col h-full bg-dark-panel">
      <div className="p-2 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-text-light">Open Orders</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {updates.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-muted text-xs">
            No open orders
          </div>
        ) : (
          updates.map((order) => (
            <div
              key={order.id}
              className="bg-dark-bg p-2 rounded border border-dark-border flex justify-between items-center"
            >
              <div>
                <div
                  className={`text-xs font-bold ${
                    order.status === "FILLED"
                      ? "text-brand-green"
                      : "text-brand-highlight"
                  }`}
                >
                  {order.status}
                </div>
                <div className="text-xs text-text-muted mt-1">{order.type} / {order.side}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-light font-mono">
                  {formatPrice(order.price)}
                </div>
                <div className="text-xs text-text-muted">
                  {order.filledQty}/{order.qty}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderUpdates;
