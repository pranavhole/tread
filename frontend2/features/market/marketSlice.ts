import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { run_query, QUERIES } from '../../services/graphql/query';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketState {
  activeSymbol: string;
  currentPrice: number;
  candles: Candle[];
}

const initialState: MarketState = {
  activeSymbol: 'BTCUSDT',
  currentPrice: 0,
  candles: [],
};

export const getCandles = createAsyncThunk(
  'market/getCandles',
  async ({ symbol, interval }: { symbol: string; interval: string }) => {
    const data = await run_query<{
      candles: {
        openTime: string | number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        closeTime: string | number;
      }[]
    }>(QUERIES.CANDLES, { symbol, interval });

    return {
      symbol,
      candles: data.candles
        .map((c) => ({
          time: typeof c.openTime === 'number' ? c.openTime : Date.parse(c.openTime),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        }))
        .filter((c) =>
          Number.isFinite(c.time) &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close)
        ),
    };
  }
);

const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    setActiveSymbol: (state, action: PayloadAction<string>) => {
      state.activeSymbol = action.payload.toUpperCase();
      state.currentPrice = 0;
      state.candles = [];
    },
    updatePrice: (state, action: PayloadAction<number>) => {
      state.currentPrice = action.payload;
    },
    addCandle: (state, action: PayloadAction<Candle>) => {
      state.candles.push(action.payload);
    },
    upsertCandle: (state, action: PayloadAction<Candle>) => {
      const candle = action.payload;
      const latest = state.candles.at(-1);

      if (latest?.time === candle.time) {
        state.candles[state.candles.length - 1] = candle;
      } else {
        state.candles.push(candle);
        if (state.candles.length > 500) {
          state.candles.shift();
        }
      }

      state.currentPrice = candle.close;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getCandles.fulfilled, (state, action) => {
      if (action.payload.symbol !== state.activeSymbol) return;

      state.candles = action.payload.candles;
      const latestCandle = action.payload.candles.at(-1);
      if (latestCandle) {
        state.currentPrice = latestCandle.close;
      }
    });
  },
});

export const { setActiveSymbol, updatePrice, addCandle, upsertCandle } = marketSlice.actions;
export default marketSlice.reducer;
