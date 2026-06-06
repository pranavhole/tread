"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, User, Settings, Hexagon, BarChart2, WalletCards } from "lucide-react";

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/trade/BTCUSDT") return pathname.startsWith("/trade/");
    return pathname === href;
  };

  const linkClass = (href: string) =>
    `p-3 rounded-xl flex justify-center transition-all duration-200 ${
      isActive(href)
        ? "bg-brand-highlight text-brand-green shadow-sm"
        : "text-text-muted hover:text-text-light hover:bg-brand-highlight/50"
    }`;

  return (
    <div className="flex flex-col items-center h-full py-4 space-y-6 bg-dark-panel border-r border-dark-border">
      <div className="text-brand-green mb-2">
        <Hexagon size={28} strokeWidth={2.5} />
      </div>

      <nav className="flex flex-col space-y-4 w-full px-2">
        {/* Dashboard Link */}
        <Link href="/trade/BTCUSDT" className={linkClass("/trade/BTCUSDT")} title="Trade">
          <Zap size={20} />
        </Link>

        {/* Profile Link */}
        <Link href="/profile" className={linkClass("/profile")} title="Profile">
          <User size={20} />
        </Link>

        {/* Placeholder Links */}
        <Link href="/markets" className={linkClass("/markets")} title="Markets">
          <BarChart2 size={20} />
        </Link>
        <Link href="/purchase" className={linkClass("/purchase")} title="Buy Tokens">
          <WalletCards size={20} />
        </Link>
        <button className="p-3 rounded-xl flex justify-center text-text-muted hover:text-text-light">
          <Settings size={20} />
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;
