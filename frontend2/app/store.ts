import { configureStore } from '@reduxjs/toolkit';
import marketReducer from '../features/market/marketSlice';
import marketDirectoryReducer from '../features/marketDirectory/marketDirectorySlice';
import orderbookReducer from '../features/orderbook/orderbookSlice';
import tradesReducer from '../features/trades/tradesSlice';
import ordersReducer from '../features/orders/orderUpdatesSlice';
import tradingReducer from '../features/trading/tradingSlice';
import authReducer from '../features/auth/authSlice'; // Import this
import drawingsReducer from '../features/drawings/drawingSlice';
import positionsReducer from '../features/positions/positionsSlice';
import transactionsReducer from '../features/transactions/transactionsSlice';

export const store = configureStore({
    reducer: {
        market: marketReducer,
        marketDirectory: marketDirectoryReducer,
        orderbook: orderbookReducer,
        trades: tradesReducer,
        orders: ordersReducer,
        trading: tradingReducer,
        auth: authReducer, // Add this
        drawings: drawingsReducer,
        positions: positionsReducer,
        transactions: transactionsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
