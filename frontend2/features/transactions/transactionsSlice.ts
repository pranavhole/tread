import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { run_query, QUERIES } from '../../services/graphql/query';
import type { Transaction } from '../profile/profileTypes';

interface TransactionsState {
  items: Transaction[];
  status: 'idle' | 'loading' | 'failed';
}

const initialState: TransactionsState = {
  items: [],
  status: 'idle',
};

export const loadTransactions = createAsyncThunk(
  'transactions/load',
  async () => {
    const data = await run_query<{ transactions: Transaction[] }>(
      QUERIES.TRANSACTIONS
    );
    return data.transactions;
  }
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTransactions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadTransactions.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload;
      })
      .addCase(loadTransactions.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export default transactionsSlice.reducer;
