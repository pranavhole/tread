export interface Order {
    id: string;
    price: number;
    qty: number;
    side: 'buy' | 'sell';
}

export interface Trade {
    price: number;
    qty: number;
    timestamp: number;
    side: 'buy' | 'sell';
}

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface MarketQuoteUpdate {
    symbol: string;
    price: number;
    change24h: number;
    volume: number;
    ts: number;
}
