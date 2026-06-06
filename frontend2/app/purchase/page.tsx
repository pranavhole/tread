"use client";

import React from "react";
import ProtectedShell from "../../components/ProtectedShell/ProtectedShell";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchUserProfile, purchaseTokens } from "../../features/auth/authSlice";
import { formatPrice } from "../../utils/format";

const WALLET_KEY = "metamask_wallet";
const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_TREASURY_ADDRESS ||
  "0x000000000000000000000000000000000000dEaD";

const PACKAGES = [
  { usd: 1, tokens: 1000 },
  { usd: 5, tokens: 10000 },
  { usd: 10, tokens: 100000 },
];

const CRYPTO_OPTIONS = ["ETH", "MATIC", "BNB", "AVAX", "BASE"];

const toHexNativeValue = (usd: number) => {
  const wei = BigInt(Math.max(1, Math.round(usd * 100000000000000)));
  return `0x${wei.toString(16)}`;
};

export default function PurchasePage() {
  const dispatch = useAppDispatch();
  const balance = useAppSelector((state) => state.auth.user?.balance ?? 0);
  const [selectedUsd, setSelectedUsd] = React.useState(10);
  const [currency, setCurrency] = React.useState("ETH");
  const [isPurchasing, setIsPurchasing] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const handlePurchase = async () => {
    setError("");
    setMessage("");

    if (!window.ethereum) {
      setError("MetaMask is required for token purchases.");
      return;
    }

    try {
      setIsPurchasing(true);
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const walletAddress = accounts[0] || localStorage.getItem(WALLET_KEY);
      if (!walletAddress) throw new Error("No MetaMask account selected.");

      localStorage.setItem(WALLET_KEY, walletAddress);
      const txHash = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: TREASURY_ADDRESS,
            value: toHexNativeValue(selectedUsd),
          },
        ],
      })) as string;

      await dispatch(
        purchaseTokens({
          packageUsd: selectedUsd,
          walletAddress,
          txHash,
          currency,
        })
      ).unwrap();
      await dispatch(fetchUserProfile()).unwrap();
      setMessage("Tokens added to your simulated balance.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token purchase failed.");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <ProtectedShell>
      <div className="h-full overflow-auto bg-dark-bg p-6 text-text-light">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Purchase Tokens</h1>
              <p className="mt-1 text-sm text-text-muted">Available: ${formatPrice(balance)}</p>
            </div>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="h-10 rounded-md border border-dark-border bg-dark-panel px-3 text-sm text-text-light outline-none"
            >
              {CRYPTO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PACKAGES.map((item) => (
              <button
                key={item.usd}
                onClick={() => setSelectedUsd(item.usd)}
                className={`rounded-md border p-5 text-left transition-colors ${
                  selectedUsd === item.usd
                    ? "border-brand-green bg-brand-green/10"
                    : "border-dark-border bg-dark-panel hover:border-text-muted"
                }`}
              >
                <div className="text-sm text-text-muted">${item.usd}</div>
                <div className="mt-2 text-2xl font-bold">${formatPrice(item.tokens)}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-text-muted">simulated tokens</div>
              </button>
            ))}
          </div>

          <button
            onClick={handlePurchase}
            disabled={isPurchasing}
            className="mt-6 h-11 rounded bg-brand-green px-6 text-sm font-bold text-dark-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPurchasing ? "Processing..." : `Buy $${formatPrice(PACKAGES.find((item) => item.usd === selectedUsd)?.tokens ?? 0)} Tokens`}
          </button>

          {message && <p className="mt-4 text-sm text-brand-green">{message}</p>}
          {error && <p className="mt-4 text-sm text-brand-red">{error}</p>}
        </div>
      </div>
    </ProtectedShell>
  );
}
