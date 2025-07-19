import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { WalletState, ConnectedWallet, WalletInfo, TokenBalance } from '@types/wallet';
import { WalletService } from '@services/WalletService';

const initialState: WalletState = {
  isInitialized: false,
  isConnecting: false,
  connectedWallet: null,
  availableWallets: [],
  recentTransactions: [],
  tokenBalances: [],
  error: null,
};

// Async thunks
export const initializeWallet = createAsyncThunk(
  'wallet/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const walletService = WalletService.getInstance();
      await walletService.initialize();
      
      const availableWallets = walletService.getAvailableWallets();
      const connectedWallet = await walletService.restoreSession();
      
      return { availableWallets, connectedWallet };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize wallet');
    }
  }
);

export const connectWallet = createAsyncThunk(
  'wallet/connect',
  async (walletInfo: WalletInfo, { rejectWithValue }) => {
    try {
      const walletService = WalletService.getInstance();
      const connectedWallet = await walletService.connectWallet(walletInfo);
      return connectedWallet;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  }
);

export const disconnectWallet = createAsyncThunk(
  'wallet/disconnect',
  async (_, { rejectWithValue }) => {
    try {
      const walletService = WalletService.getInstance();
      await walletService.disconnectWallet();
      return null;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to disconnect wallet');
    }
  }
);

export const switchChain = createAsyncThunk(
  'wallet/switchChain',
  async (chainId: number, { rejectWithValue, getState }) => {
    try {
      const walletService = WalletService.getInstance();
      await walletService.switchChain(chainId);
      
      const connectedWallet = walletService.getConnectedWallet();
      return connectedWallet;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to switch chain');
    }
  }
);

export const loadTokenBalances = createAsyncThunk(
  'wallet/loadTokenBalances',
  async (tokenAddresses: string[], { rejectWithValue, getState }) => {
    try {
      const state = getState() as { wallet: WalletState };
      const { connectedWallet } = state.wallet;
      
      if (!connectedWallet) {
        throw new Error('No wallet connected');
      }
      
      const walletService = WalletService.getInstance();
      const balances = await walletService.getTokenBalances(connectedWallet.address, tokenAddresses);
      return balances;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load token balances');
    }
  }
);

export const refreshBalance = createAsyncThunk(
  'wallet/refreshBalance',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { wallet: WalletState };
      const { connectedWallet } = state.wallet;
      
      if (!connectedWallet) {
        throw new Error('No wallet connected');
      }
      
      const walletService = WalletService.getInstance();
      const balance = await walletService.getBalance(connectedWallet.address);
      
      return { ...connectedWallet, balance };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to refresh balance');
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateWalletBalance: (state, action: PayloadAction<string>) => {
      if (state.connectedWallet) {
        state.connectedWallet.balance = action.payload;
      }
    },
    addRecentTransaction: (state, action) => {
      state.recentTransactions.unshift(action.payload);
      // Keep only last 10 transactions
      if (state.recentTransactions.length > 10) {
        state.recentTransactions = state.recentTransactions.slice(0, 10);
      }
    },
    updateTransactionStatus: (state, action: PayloadAction<{ hash: string; status: string; blockNumber?: number }>) => {
      const transaction = state.recentTransactions.find(tx => tx.hash === action.payload.hash);
      if (transaction) {
        transaction.status = action.payload.status as any;
        if (action.payload.blockNumber) {
          transaction.blockNumber = action.payload.blockNumber;
          transaction.timestamp = Date.now();
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Initialize wallet
    builder.addCase(initializeWallet.pending, (state) => {
      state.error = null;
    });
    builder.addCase(initializeWallet.fulfilled, (state, action) => {
      state.isInitialized = true;
      state.availableWallets = action.payload.availableWallets;
      state.connectedWallet = action.payload.connectedWallet;
      state.error = null;
    });
    builder.addCase(initializeWallet.rejected, (state, action) => {
      state.isInitialized = false;
      state.error = action.payload as string;
    });

    // Connect wallet
    builder.addCase(connectWallet.pending, (state) => {
      state.isConnecting = true;
      state.error = null;
    });
    builder.addCase(connectWallet.fulfilled, (state, action) => {
      state.isConnecting = false;
      state.connectedWallet = action.payload;
      state.error = null;
    });
    builder.addCase(connectWallet.rejected, (state, action) => {
      state.isConnecting = false;
      state.error = action.payload as string;
    });

    // Disconnect wallet
    builder.addCase(disconnectWallet.fulfilled, (state) => {
      state.connectedWallet = null;
      state.tokenBalances = [];
      state.recentTransactions = [];
      state.error = null;
    });
    builder.addCase(disconnectWallet.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Switch chain
    builder.addCase(switchChain.fulfilled, (state, action) => {
      state.connectedWallet = action.payload;
      state.tokenBalances = []; // Clear balances when switching chains
      state.error = null;
    });
    builder.addCase(switchChain.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Load token balances
    builder.addCase(loadTokenBalances.fulfilled, (state, action) => {
      state.tokenBalances = action.payload;
      state.error = null;
    });
    builder.addCase(loadTokenBalances.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Refresh balance
    builder.addCase(refreshBalance.fulfilled, (state, action) => {
      state.connectedWallet = action.payload;
      state.error = null;
    });
    builder.addCase(refreshBalance.rejected, (state, action) => {
      state.error = action.payload as string;
    });
  },
});

export const { 
  clearError, 
  updateWalletBalance, 
  addRecentTransaction, 
  updateTransactionStatus 
} = walletSlice.actions;

export default walletSlice.reducer;