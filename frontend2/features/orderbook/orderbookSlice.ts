import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface Order {
    price: number;
    qty: number;
}

interface OrderbookState {
    bids: Order[];
    asks: Order[];
}

const initialState: OrderbookState = {
    bids: [],
    asks: [],
};

const orderbookSlice = createSlice({
    name: 'orderbook',
    initialState,
    reducers: {
        updateOrderbook: (state, action: PayloadAction<{ bids: Order[]; asks: Order[] }>) => {
            // Keep only top 15 for UI performance
            state.bids = action.payload.bids.slice(0, 15);
            state.asks = action.payload.asks.slice(0, 15);
        },
        resetOrderbook: (state) => {
            state.bids = [];
            state.asks = [];
        },
    },
});

export const { updateOrderbook, resetOrderbook } = orderbookSlice.actions;
export default orderbookSlice.reducer;
