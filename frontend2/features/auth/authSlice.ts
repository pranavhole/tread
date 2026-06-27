import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { run_query, MUTATIONS, QUERIES } from '../../services/graphql/query';
import type { AccountUser } from '../profile/profileTypes';

interface AuthPayload {
  token: string;
  user: AccountUser;
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const data = await run_query<{ login: AuthPayload }>(
      MUTATIONS.LOGIN,
      { email: credentials.email, password: credentials.password }
    )
    return data.login
  }
)

export const signUp = createAsyncThunk(
  'auth/signup',
  async (credentials: { email: string; password: string; username?: string }) => {
    const data = await run_query<{ signup: AuthPayload }>(
      MUTATIONS.SIGNUP,
      credentials
    )
    return data.signup
  }
)

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (profile: { email: string; name?: string; googleId?: string }) => {
    const data = await run_query<{ googleLogin: AuthPayload }>(
      MUTATIONS.GOOGLE_LOGIN,
      profile
    )
    return data.googleLogin
  }
)

export const connectWallet = createAsyncThunk(
  'auth/connectWallet',
  async (walletAddress: string) => {
    const data = await run_query<{ connectWallet: AccountUser }>(
      MUTATIONS.CONNECT_WALLET,
      { walletAddress }
    )
    return data.connectWallet
  }
)

export const skipWalletGrant = createAsyncThunk(
  'auth/skipWalletGrant',
  async () => {
    const data = await run_query<{ skipWalletGrant: AccountUser }>(
      MUTATIONS.SKIP_WALLET_GRANT
    )
    return data.skipWalletGrant
  }
)

export const purchaseTokens = createAsyncThunk(
  'auth/purchaseTokens',
  async (input: {
    packageUsd: number;
    walletAddress: string;
    txHash: string;
    currency?: string;
  }) => {
    const data = await run_query<{ purchaseTokens: AccountUser }>(
      MUTATIONS.PURCHASE_TOKENS,
      input
    )
    return data.purchaseTokens
  }
)

export const fetchUserProfile = createAsyncThunk('auth/me', async () => {
  const data = await run_query<{ me: AccountUser | null }>(QUERIES.ME)
  return data.me
})

interface AuthState {
  user: AccountUser | null;
  token: string | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'failed';
}

const readStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

const writeStoredToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
};

const clearStoredToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
};

const token = readStoredToken();

const initialState: AuthState = {
  user: null,
  token: token || null,
  isAuthenticated: !!token,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      clearStoredToken();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'idle';
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        writeStoredToken(action.payload.token);
      })
      .addCase(loginUser.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(signUp.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.status = 'idle';
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        writeStoredToken(action.payload.token);
      })
      .addCase(signUp.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(googleLogin.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.status = 'idle';
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        writeStoredToken(action.payload.token);
      })
      .addCase(googleLogin.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(connectWallet.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(skipWalletGrant.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(purchaseTokens.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload
          ? { ...state.user, ...action.payload }
          : null;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
