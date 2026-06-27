"use client";

import React from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { connectWallet, fetchUserProfile, skipWalletGrant } from "../../features/auth/authSlice";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const WALLET_KEY = "metamask_wallet";
const WALLET_SKIP_KEY = "metamask_wallet_skipped";
const METAMASK_TIMEOUT_MS = 15000;

const readStoredWallet = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(WALLET_KEY) || "";
};

const readWalletSkipped = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(WALLET_SKIP_KEY) === "true";
};

const requestWithTimeout = async <T,>(
  request: Promise<unknown>,
  timeoutMessage: string
) =>
  (await Promise.race([
    request,
    new Promise((_, reject) =>
      window.setTimeout(() => reject(new Error(timeoutMessage)), METAMASK_TIMEOUT_MS)
    ),
  ])) as T;

const getWalletErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;

  if (typeof err === "object" && err !== null) {
    const maybeError = err as { code?: number; message?: string };
    if (maybeError.code === -32002) {
      return "MetaMask already has a pending connection request. Open MetaMask and approve it.";
    }
    if (maybeError.code === 4001) {
      return "MetaMask connection was rejected.";
    }
    if (maybeError.message) return maybeError.message;
  }

  return "MetaMask connection failed.";
};

export default function WalletGate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [walletAddress, setWalletAddress] = React.useState("");
  const [walletSkipped, setWalletSkipped] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isSkipping, setIsSkipping] = React.useState(false);

  React.useEffect(() => {
    setWalletAddress(readStoredWallet());
    setWalletSkipped(readWalletSkipped());
  }, []);

  const handleConnect = async () => {
    setError("");

    if (!window.ethereum) {
      setError("MetaMask is required to continue.");
      return;
    }

    try {
      setIsConnecting(true);
      const currentAccounts = await requestWithTimeout<string[]>(
        window.ethereum.request({ method: "eth_accounts" }),
        "MetaMask did not respond. Unlock MetaMask and try again."
      );
      const accounts =
        currentAccounts.length > 0
          ? currentAccounts
          : await requestWithTimeout<string[]>(
              window.ethereum.request({
                method: "eth_requestAccounts",
              }),
              "MetaMask did not respond. Check for a hidden MetaMask popup, unlock it, then try again."
            );
      const account = accounts[0];
      if (!account) throw new Error("No MetaMask account selected.");

      await dispatch(connectWallet(account)).unwrap();
      await dispatch(fetchUserProfile()).unwrap();
      localStorage.setItem(WALLET_KEY, account);
      localStorage.removeItem(WALLET_SKIP_KEY);
      setWalletAddress(account);
      setWalletSkipped(false);
    } catch (err) {
      setError(getWalletErrorMessage(err));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkip = async () => {
    setError("");

    try {
      setIsSkipping(true);
      await dispatch(skipWalletGrant()).unwrap();
      localStorage.setItem(WALLET_SKIP_KEY, "true");
      setWalletSkipped(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add starter balance.");
    } finally {
      setIsSkipping(false);
    }
  };

  if (walletAddress || walletSkipped) return <>{children}</>;

  return (
    <div className="grid h-full place-items-center bg-dark-bg px-4 text-text-light">
      <div className="w-full max-w-md rounded-md border border-dark-border bg-dark-panel p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand-green/10 text-brand-green">
          <Wallet size={24} />
        </div>
        <h1 className="text-xl font-bold">Connect MetaMask</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Connect your wallet to claim the one-time $100,000 simulated token balance for {user?.email}, or skip MetaMask and start with $200.
        </p>
        <button
          onClick={handleConnect}
          disabled={isConnecting || isSkipping}
          className="mt-5 h-11 w-full rounded bg-brand-green text-sm font-bold text-dark-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isConnecting || isSkipping}
          className="mt-3 h-10 w-full rounded border border-dark-border bg-dark-bg text-sm font-semibold text-text-light transition-colors hover:border-brand-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSkipping ? "Adding $200..." : "Continue without MetaMask"}
        </button>
        <Link
          href="/purchase"
          className="mt-3 block text-center text-xs font-semibold text-text-muted hover:text-text-light"
        >
          Buy more simulated tokens
        </Link>
        {error && <p className="mt-4 text-xs text-brand-red">{error}</p>}
      </div>
    </div>
  );
}
