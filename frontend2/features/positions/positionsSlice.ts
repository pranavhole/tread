import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fetchUserProfile } from '../auth/authSlice';
import type { Position } from '../profile/profileTypes';

interface PositionsState {
  items: Position[];
}

const initialState: PositionsState = {
  items: [],
};

const positionsSlice = createSlice({
  name: 'positions',
  initialState,
  reducers: {
    setPositions: (state, action: PayloadAction<Position[]>) => {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserProfile.fulfilled, (state, action) => {
      state.items = action.payload?.positions ?? [];
    });
  },
});

export const { setPositions } = positionsSlice.actions;
export default positionsSlice.reducer;
