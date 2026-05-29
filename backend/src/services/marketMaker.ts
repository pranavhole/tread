import { Server } from 'socket.io';
import { orderbook } from '../state/orderbook.js';
import { v4 as uuidv4 } from 'uuid';
import { Trade, Candle } from '../types/index.js';

// Global store for candles
const closedCandles: Candle[] = [];
let currentCandle: Candle | null = null;

export const getMarketCandles = () => {
    if (currentCandle) {
        return [...closedCandles, currentCandle];
    }
    return closedCandles;
};

export class MarketMaker {
    private io: Server;
    private lastCandleTime: number = 0;

    constructor(io: Server) {
        this.io = io;
        // Generate initial history so the chart isn't empty on start
        this.generateHistoricalData();
        this.startSimulation();
    }

    private generateHistoricalData() {
        const now = Date.now();
        const oneMinute = 60000;
        let price = orderbook.currentPrice;

        // Generate last 60 minutes of data
        for (let i = 60; i > 0; i--) {
            const time = Math.floor((now - i * oneMinute) / oneMinute) * oneMinute;
            const open = price;
            const close = price + (Math.random() - 0.5) * 50; // Random movement
            const high = Math.max(open, close) + Math.random() * 10;
            const low = Math.min(open, close) - Math.random() * 10;

            closedCandles.push({
                time,
                open,
                high,
                low,
                close,
                volume: Math.random() * 10
            });

            // Update price for next candle
            price = close;
        }

        // Update global price to match the last candle
        orderbook.currentPrice = price;
    }

    private startSimulation() {
        // 1. Price Ticker (Fast - 200ms)
        setInterval(() => this.updatePrice(), 200);

        // 2. Orderbook Updates (Socket - 1s)
        setInterval(() => this.updateOrderbook(), 1000);

        // 3. Trade Execution (Random - 2s)
        setInterval(() => this.executeTrade(), 2000);
    }

    private updatePrice() {
        const volatility = 5;
        const change = (Math.random() - 0.5) * volatility;
        orderbook.currentPrice += change;

        // Keep price realistic
        if (orderbook.currentPrice < 1000) orderbook.currentPrice = 1000;

        this.processCandle(orderbook.currentPrice);

        // Emit Price Update (For Topbar Ticker)
        this.io.emit('price:update', {
            symbol: 'BTCUSDT',
            price: orderbook.currentPrice,
            change24h: 0,
            volume: 0,
            ts: Date.now()
        });
    }

    private processCandle(price: number) {
        const now = Date.now();
        // Round down to nearest minute
        const candleTime = Math.floor(now / 60000) * 60000;

        if (candleTime !== this.lastCandleTime) {
            // New Candle Interval Started

            // 1. Archive the previous candle if it exists
            if (currentCandle) {
                closedCandles.push(currentCandle);
                // Keep history size manageable (e.g., last 500 candles)
                if (closedCandles.length > 500) {
                    closedCandles.shift();
                }
            }

            // 2. Start new candle
            currentCandle = {
                time: candleTime,
                open: price,
                high: price,
                low: price,
                close: price,
                volume: 0
            };
            this.lastCandleTime = candleTime;
        } else if (currentCandle) {
            // Update running candle
            currentCandle.close = price;
            currentCandle.high = Math.max(currentCandle.high, price);
            currentCandle.low = Math.min(currentCandle.low, price);
        }
    }

    private updateOrderbook() {
        // Generate some mock movement in depth
        const spread = 2;

        // Bids
        orderbook.bids = Array.from({ length: 15 }, (_, i) => ({
            id: uuidv4(),
            price: orderbook.currentPrice - spread - (i * (Math.random() * 5)),
            qty: parseFloat((Math.random() * 2).toFixed(4)),
            side: 'buy' as const
        })).sort((a, b) => b.price - a.price);

        // Asks
        orderbook.asks = Array.from({ length: 15 }, (_, i) => ({
            id: uuidv4(),
            price: orderbook.currentPrice + spread + (i * (Math.random() * 5)),
            qty: parseFloat((Math.random() * 2).toFixed(4)),
            side: 'sell' as const
        })).sort((a, b) => a.price - b.price);

        // Emit via Socket
        this.io.emit('orderbook:update', {
            symbol: 'BTCUSDT',
            bids: orderbook.bids,
            asks: orderbook.asks
        });
    }

    private executeTrade() {
        // Mock trade execution logic
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const qty = parseFloat((Math.random() * 0.5).toFixed(4));

        // Add volume to current candle
        if (currentCandle) {
            currentCandle.volume += qty;
        }

        const trade: Trade = {
            price: orderbook.currentPrice,
            qty,
            timestamp: Date.now(),
            side: side as 'buy' | 'sell'
        };

        this.io.emit('trade:executed', { symbol: 'BTCUSDT', ...trade });
    }
}
