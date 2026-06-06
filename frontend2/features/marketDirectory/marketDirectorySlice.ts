import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type MarketSort = 'volume' | 'gainers' | 'losers' | 'symbol';

interface QuotePayload {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

interface MarketDirectoryState {
  symbols: string[];
  prices: Record<string, number>;
  changes: Record<string, number>;
  volumes: Record<string, number>;
  search: string;
  sort: MarketSort;
}

const initialState: MarketDirectoryState = {
  symbols: [],
  prices: {},
  changes: {},
  volumes: {},
  search: '',
  sort: 'volume',
};

const marketDirectorySlice = createSlice({
  name: 'marketDirectory',
  initialState,
  reducers: {
    setSymbols: (state, action: PayloadAction<string[]>) => {
      state.symbols = action.payload.map((symbol) => symbol.toUpperCase());
    },
    upsertQuote: (state, action: PayloadAction<QuotePayload>) => {
      const { symbol, price, change24h, volume } = action.payload;
      const normalizedSymbol = symbol.toUpperCase();

      if (!state.symbols.includes(normalizedSymbol)) {
        state.symbols.push(normalizedSymbol);
      }

      state.prices[normalizedSymbol] = price;
      state.changes[normalizedSymbol] = change24h;
      state.volumes[normalizedSymbol] = volume;
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    setSort: (state, action: PayloadAction<MarketSort>) => {
      state.sort = action.payload;
    },
  },
});

export const { setSymbols, upsertQuote, setSearch, setSort } = marketDirectorySlice.actions;
export default marketDirectorySlice.reducer;
