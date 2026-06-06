import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { run_query, MUTATIONS } from '../../services/graphql/query';
import type { Order } from '../profile/profileTypes';

interface OrderPayload {
  type: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  qty: number;
  price?: number;
  symbol?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

interface TradingState {
  balance: number;
  positionQty: number;
  avgPrice: number;
  realizedPnL: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

type PlacedOrder = Order;

const initialState: TradingState = {
  balance: 50000.00,
  positionQty: 0.15,
  avgPrice: 41500.00,
  realizedPnL: 120.50,
  status: 'idle',
  error: null,
};

export const placeOrder = createAsyncThunk(
  'trading/placeOrder',
  async (orderData: OrderPayload, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { market: { activeSymbol: string } }
      const symbol = orderData.symbol ?? state.market.activeSymbol
      const data = await run_query<{ placeOrder: PlacedOrder }>(
        MUTATIONS.PLACE_ORDER,
        { input: { ...orderData, symbol } }
      )
      return data.placeOrder
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to place order'
      return rejectWithValue(message)
    }
  }
);

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    resetStatus: (state) => {
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(placeOrder.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { resetStatus } = tradingSlice.actions;
export default tradingSlice.reducer;
