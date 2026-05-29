import { Order } from '../types/index.js';

class Orderbook {
    bids: Order[] = [];
    asks: Order[] = [];
    currentPrice: number = 42000;

    constructor() {
        this.generateInitialState();
    }

    generateInitialState() {
        for (let i = 1; i <= 15; i++) {
            this.bids.push({
                id: `bid-${i}`,
                price: this.currentPrice - i * 5,
                qty: parseFloat((Math.random() * 2).toFixed(4)),
                side: 'buy' as const // <--- FIX: Forces type to be "buy" instead of string
            });

            this.asks.push({
                id: `ask-${i}`,
                price: this.currentPrice + i * 5,
                qty: parseFloat((Math.random() * 2).toFixed(4)),
                side: 'sell' as const // <--- FIX: Forces type to be "sell" instead of string
            });
        }
    }

    getSnapshot() {
        return {
            bids: this.bids,
            asks: this.asks,
        };
    }
}

export const orderbook = new Orderbook();