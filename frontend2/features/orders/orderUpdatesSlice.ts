import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { run_query, QUERIES, MUTATIONS } from '../../services/graphql/query';
import type { Order } from '../profile/profileTypes';
import { placeOrder } from '../trading/tradingSlice';

interface OrdersState {
  openOrders: Order[];
  history: Order[];
  status: 'idle' | 'loading' | 'failed';
}

const initialState: OrdersState = {
  openOrders: [],
  history: [],
  status: 'idle',
};

const isOpenOrder = (status: Order['status']) =>
  status === 'OPEN' || status === 'PARTIAL_FILL' || status === 'PARTIALLY_FILLED';

const sortByNewest = (left: Order, right: Order) =>
  new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() -
  new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();

const applyOrderUpdate = (state: OrdersState, updatedOrder: Order) => {
  const historyIndex = state.history.findIndex((order) => order.id === updatedOrder.id);

  if (historyIndex !== -1) {
    state.history[historyIndex] = {
      ...state.history[historyIndex],
      ...updatedOrder,
    };
  } else {
    state.history.unshift(updatedOrder);
  }

  state.history.sort(sortByNewest);

  const openIndex = state.openOrders.findIndex((order) => order.id === updatedOrder.id);

  if (isOpenOrder(updatedOrder.status)) {
    if (openIndex !== -1) {
      state.openOrders[openIndex] = {
        ...state.openOrders[openIndex],
        ...updatedOrder,
      };
    } else {
      state.openOrders.unshift(updatedOrder);
    }
    state.openOrders.sort(sortByNewest);
  } else if (openIndex !== -1) {
    state.openOrders.splice(openIndex, 1);
  }
};

export const loadOpenOrders = createAsyncThunk(
  'orders/loadOpen',
  async () => {
    const data = await run_query<{ orders: Order[] }>(QUERIES.ORDERS);
    return data.orders;
  }
);

export const cancelOpenOrders = createAsyncThunk(
  'orders/cancelOpenOrders',
  async () => {
    const data = await run_query<{ cancelOpenOrders: number }>(
      MUTATIONS.CANCEL_OPEN_ORDERS
    );
    return data.cancelOpenOrders;
  }
);

const orderUpdatesSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    processOrderUpdate: (state, action: PayloadAction<Order>) => {
      applyOrderUpdate(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOpenOrders.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadOpenOrders.fulfilled, (state, action) => {
        state.status = 'idle';
        state.history = action.payload.slice().sort(sortByNewest);
        state.openOrders = action.payload
          .filter((order) => isOpenOrder(order.status))
          .sort(sortByNewest);
      })
      .addCase(loadOpenOrders.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(cancelOpenOrders.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(cancelOpenOrders.fulfilled, (state) => {
        state.status = 'idle';
        state.openOrders = [];
      })
      .addCase(cancelOpenOrders.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        applyOrderUpdate(state, action.payload);
      });
  },
});

export const { processOrderUpdate } = orderUpdatesSlice.actions;
export default orderUpdatesSlice.reducer;
