import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { run_query, QUERIES } from '../../services/graphql/query';
import type { Trade } from '../profile/profileTypes';

interface TradeTick {
  price: number;
  qty: number;
  timestamp: number;
  side?: 'buy' | 'sell';
}

interface TradesState {
  history: Trade[];
  executedTrades: TradeTick[];
  status: 'idle' | 'loading' | 'failed';
}

const initialState: TradesState = {
  history: [],
  executedTrades: [],
  status: 'idle',
};

export const loadTrades = createAsyncThunk(
  'trades/loadHistory',
  async () => {
    const data = await run_query<{ trades: Trade[] }>(QUERIES.TRADES);
    return data.trades;
  }
);

const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    addTrade: (state, action: PayloadAction<TradeTick>) => {
      state.executedTrades.unshift(action.payload);
      if (state.executedTrades.length > 50) {
        state.executedTrades.pop();
      }
    },
    addTrades: (state, action: PayloadAction<TradeTick[]>) => {
      state.executedTrades.unshift(...action.payload);
      if (state.executedTrades.length > 50) {
        state.executedTrades = state.executedTrades.slice(0, 50);
      }
    },
    resetTrades: (state) => {
      state.executedTrades = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTrades.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadTrades.fulfilled, (state, action) => {
        state.status = 'idle';
        state.history = action.payload;
      })
      .addCase(loadTrades.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export const { addTrade, addTrades, resetTrades } = tradesSlice.actions;
export default tradesSlice.reducer;
