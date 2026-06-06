"use client";

import React from "react";
import ProfileCard from "./ProfileCard";
import { convertDisplayValue } from "../../features/profile/profileSelectors";
import {
  formatCurrencyValue,
  formatDateTime,
} from "../../utils/format";
import type { Transaction } from "../../features/profile/profileTypes";

type TransactionsTableProps = {
  rows: Transaction[];
  currency: "USDT" | "INR";
};

const TransactionsTable: React.FC<TransactionsTableProps> = ({
  rows,
  currency,
}) => {
  return (
    <ProfileCard
      title="Transaction History"
      subtitle="Deposits, fees, and balance movements captured on your account."
      className="overflow-hidden"
    >
      {rows.length === 0 ? (
        <div className="grid min-h-[240px] place-items-center px-6 text-center text-sm text-text-muted">
          No transactions available yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-dark-bg/70 text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Note</th>
                <th className="px-5 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((transaction) => {
                const isNegative =
                  transaction.type === "WITHDRAWAL" || transaction.type === "FEE";

                return (
                  <tr
                    key={transaction.id}
                    className="border-t border-[#2a2e39] transition hover:bg-brand-highlight/30"
                  >
                    <td className="px-5 py-4 text-sm text-text-light">
                      {transaction.type}
                    </td>
                    <td
                      className={`px-5 py-4 text-right font-mono text-sm ${
                        isNegative ? "text-brand-red" : "text-brand-green"
                      }`}
                    >
                      {isNegative ? "-" : "+"}
                      {formatCurrencyValue(
                        convertDisplayValue(
                          Math.abs(transaction.amount),
                          currency
                        ),
                        currency
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-text-muted">
                      Completed
                    </td>
                    <td className="px-5 py-4 text-sm text-text-muted">
                      {transaction.note ?? "--"}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-text-muted">
                      {formatDateTime(transaction.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ProfileCard>
  );
};

export default TransactionsTable;
