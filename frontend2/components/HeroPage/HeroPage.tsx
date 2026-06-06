"use client";

import React from "react";
import { ArrowRight, BarChart3, Bitcoin, Play, Wallet } from "lucide-react";
import Link from "next/link";
import { useAppSelector } from "../../app/hooks";

const marketRows = [
  { symbol: "AAPL", name: "Apple", price: "$214.40", move: "+1.28%" },
  { symbol: "TSLA", name: "Tesla", price: "$248.92", move: "-0.42%" },
  { symbol: "BTC", name: "Bitcoin", price: "$64,820", move: "+2.18%" },
  { symbol: "ETH", name: "Ethereum", price: "$3,280", move: "+0.74%" },
];

const HeroPage: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const primaryTarget = isAuthenticated ? "/dashboard" : "/login";

  return (
    <main className="min-h-screen bg-dark-bg text-text-light overflow-hidden">
      <section className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(22,184,128,0.16),transparent_34%),linear-gradient(135deg,#121417_0%,#171a1f_48%,#111315_100%)]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <nav className="flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded border border-brand-green/40 bg-brand-green/10">
                <BarChart3 className="h-5 w-5 text-brand-green" />
              </span>
              <span className="text-lg font-semibold">TokenTrade</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden rounded border border-dark-border px-4 py-2 text-sm text-text-muted transition hover:border-brand-green/60 hover:text-text-light sm:inline-flex"
              >
                Login
              </Link>
              <Link
                href={primaryTarget}
                className="inline-flex items-center gap-2 rounded bg-brand-green px-4 py-2 text-sm font-semibold text-dark-bg transition hover:bg-[#20d194]"
              >
                <Wallet className="h-4 w-4" />
                Start
              </Link>
            </div>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-10">
            <div className="max-w-2xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded border border-dark-border bg-dark-panel/70 px-3 py-2 text-sm text-text-muted">
                <span className="h-2 w-2 rounded-full bg-brand-green" />
                Real trading simulation with token money
              </p>

              <h1 className="max-w-3xl text-5xl font-black leading-[1.02] text-text-light sm:text-6xl lg:text-7xl">
                Trade Real Markets With Virtual Money
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-text-muted">
                Practice stock market trading without risking real cash. Use
                virtual token money to place trades, track performance, and
                learn market behavior. In crypto mode, trade currencies and
                virtually buy and hold Bitcoin, Ethereum, and more.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryTarget}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded bg-brand-green px-6 text-sm font-bold text-dark-bg transition hover:bg-[#20d194]"
                >
                  Start Trading
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded border border-dark-border bg-dark-panel/80 px-6 text-sm font-semibold text-text-light transition hover:border-brand-green/60"
                >
                  <Play className="h-4 w-4" />
                  View Demo
                </Link>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                <div className="rounded border border-dark-border bg-dark-panel/70 p-4">
                  <p className="text-2xl font-bold">$100K</p>
                  <p className="mt-1 text-xs text-text-muted">
                    virtual balance
                  </p>
                </div>
                <div className="rounded border border-dark-border bg-dark-panel/70 p-4">
                  <p className="text-2xl font-bold">Stocks</p>
                  <p className="mt-1 text-xs text-text-muted">
                    market simulator
                  </p>
                </div>
                <div className="rounded border border-dark-border bg-dark-panel/70 p-4">
                  <p className="text-2xl font-bold">Crypto</p>
                  <p className="mt-1 text-xs text-text-muted">
                    buy and hold
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[440px] lg:min-h-[620px]">
              <div className="absolute inset-x-0 top-8 mx-auto h-[420px] max-w-[680px] rounded border border-dark-border bg-dark-panel shadow-2xl shadow-black/40 lg:h-[560px]">
                <div className="flex h-12 items-center justify-between border-b border-dark-border px-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-red" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f5b84b]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />
                  </div>
                  <div className="flex rounded border border-dark-border bg-dark-bg p-1 text-xs">
                    <span className="rounded bg-brand-green px-3 py-1 font-semibold text-dark-bg">
                      Stocks
                    </span>
                    <span className="px-3 py-1 text-text-muted">Crypto</span>
                  </div>
                </div>

                <div className="grid h-[calc(100%-48px)] grid-rows-[1fr_150px] lg:grid-cols-[1fr_220px] lg:grid-rows-1">
                  <div className="relative border-b border-dark-border p-5 lg:border-b-0 lg:border-r">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <p className="text-sm text-text-muted">Portfolio</p>
                        <p className="mt-1 text-3xl font-bold">$104,820.44</p>
                      </div>
                      <p className="rounded bg-brand-green/10 px-2 py-1 text-sm font-semibold text-brand-green">
                        +4.82%
                      </p>
                    </div>

                    <div className="absolute inset-x-5 bottom-10 top-24 flex items-end gap-2">
                      {[42, 58, 49, 74, 63, 88, 70, 96, 82, 112, 92, 126].map(
                        (height, index) => (
                          <span
                            key={index}
                            className={`w-full rounded-t ${
                              index % 4 === 1
                                ? "bg-brand-red/80"
                                : "bg-brand-green/80"
                            }`}
                            style={{ height }}
                          />
                        )
                      )}
                    </div>

                    <div className="absolute inset-x-5 bottom-5 flex justify-between text-xs text-text-muted">
                      <span>9:30</span>
                      <span>12:00</span>
                      <span>15:30</span>
                    </div>
                  </div>

                  <aside className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-1">
                    <div className="rounded border border-dark-border bg-dark-bg p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-text-muted">Token Cash</p>
                        <Wallet className="h-4 w-4 text-brand-green" />
                      </div>
                      <p className="mt-2 text-2xl font-bold">$86,500</p>
                      <p className="mt-1 text-xs text-text-muted">
                        ready to trade
                      </p>
                    </div>

                    <div className="rounded border border-dark-border bg-dark-bg p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-text-muted">Crypto Hold</p>
                        <Bitcoin className="h-4 w-4 text-[#f5b84b]" />
                      </div>
                      <p className="mt-2 text-2xl font-bold">0.42 BTC</p>
                      <p className="mt-1 text-xs text-text-muted">
                        bought virtually
                      </p>
                    </div>

                    <div className="col-span-2 hidden rounded border border-dark-border bg-dark-bg p-3 lg:col-span-1 lg:block">
                      {marketRows.map((row) => (
                        <div
                          key={row.symbol}
                          className="flex items-center justify-between border-b border-dark-border/70 py-2 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-semibold">{row.symbol}</p>
                            <p className="text-xs text-text-muted">{row.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{row.price}</p>
                            <p
                              className={`text-xs ${
                                row.move.startsWith("+")
                                  ? "text-brand-green"
                                  : "text-brand-red"
                              }`}
                            >
                              {row.move}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HeroPage;
