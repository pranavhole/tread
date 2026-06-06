"use client";

import React from "react";
import ChartArea from "../ChartArea/ChartArea";
import Orderbook from "../Orderbook/Orderbook";
import TradingPanel from "../TradingPanel/TradingPanel";
import TradeFeed from "../TradeFeed/Tradefeed";
import OrderUpdates from "../OrderUpdates/OrderUpdates";
import PortfolioPanel from "../PortfolioPanel/PortfolioPanel";

const Dashboard: React.FC = () => {
  return (
    <div className="h-full w-full overflow-y-auto bg-dark-bg lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[minmax(0,1fr)_210px] lg:overflow-hidden">
      <main className="min-h-[430px] border-b border-dark-border/80 bg-dark-bg lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2 lg:min-h-0 lg:border-r">
        <ChartArea />
      </main>

      <aside className="hidden border-l border-dark-border/80 bg-dark-panel lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-3 lg:flex lg:flex-col">
        <div className="min-h-0 flex-[1.35] border-b border-dark-border/80">
          <Orderbook />
        </div>
        <div className="min-h-[300px] flex-1">
          <TradingPanel />
        </div>
      </aside>

      <section className="grid border-b border-dark-border/80 bg-dark-panel sm:grid-cols-2 lg:hidden">
        <div className="min-h-[520px] border-b border-dark-border/80 sm:border-b-0 sm:border-r">
          <Orderbook />
        </div>
        <div className="min-h-[360px]">
          <TradingPanel />
        </div>
      </section>

      <footer className="grid min-h-[520px] border-t border-dark-border/80 bg-dark-panel sm:grid-cols-2 lg:col-start-1 lg:col-end-2 lg:row-start-2 lg:row-end-3 lg:min-h-0 lg:grid-cols-3">
        <div className="min-h-[220px] border-b border-dark-border/80 sm:border-r lg:min-h-0 lg:border-b-0">
          <TradeFeed />
        </div>
        <div className="min-h-[220px] border-b border-dark-border/80 sm:border-b-0 sm:border-r lg:min-h-0">
          <OrderUpdates />
        </div>
        <div className="min-h-[220px] sm:col-span-2 lg:col-span-1 lg:min-h-0">
          <PortfolioPanel />
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
