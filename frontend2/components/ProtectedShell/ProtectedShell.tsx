"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../../app/hooks";
import Sidebar from "../Sidebar/Sidebar";
import Topbar from "../Tobar/Topbar";
import WalletGate from "../WalletGate/WalletGate";

export default function ProtectedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setHasMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (hasMounted && !isAuthenticated) {
      router.replace("/");
    }
  }, [hasMounted, isAuthenticated, router]);

  if (!hasMounted) {
    return (
      <div className="grid min-h-screen place-items-center bg-dark-bg text-text-muted">
        Loading dashboard...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-dark-bg text-text-muted">
        Redirecting to landing page...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-dark-bg text-text-light grid grid-rows-[48px_1fr] grid-cols-[60px_1fr] overflow-hidden">
      <header className="col-span-full row-start-1 row-end-2 z-20">
        <Topbar />
      </header>

      <aside className="row-start-2 row-end-3 col-start-1 col-end-2 z-10">
        <Sidebar />
      </aside>

      <main className="col-start-2 col-end-3 row-start-2 row-end-3 bg-dark-bg relative overflow-hidden">
        <WalletGate>{children}</WalletGate>
      </main>
    </div>
  );
}
