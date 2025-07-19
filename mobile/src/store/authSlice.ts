import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthenticationState, User, LoginRequest, SecuritySettings, BiometricCapabilities } from '@types/auth';
import { BiometricAuthService } from '@services/BiometricAuthService';
import { ApiService } from '@services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState: AuthenticationState = {
  isAuthenticated: false,
  user: null,
  biometricAvailable: false,
  biometricEnabled: false,
  biometricType: null,
  pinEnabled: false,
  sessionExpiry: null,
  authMethod: null,
  loading: false,
  error: null,
};

// Async thunks
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      const apiService = ApiService.getInstance();
      
      await biometricService.initialize();
      
      // Check biometric capabilities
      const capabilities = await biometricService.checkBiometricCapabilities();
      
      // Load security settings
      const securitySettings = await biometricService.getSecuritySettings();
      
      // Check if user is authenticated
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      let user: User | null = null;
      let isAuthenticated = false;
      
      if (token && userData) {
        try {
          user = JSON.parse(userData);
          apiService.setAuthToken(token);
          
          // Check if authentication is required
          const authRequired = await biometricService.checkAuthenticationRequired();
          isAuthenticated = !authRequired;
        } catch (error) {
          // Invalid stored data, clear it
          await AsyncStorage.multiRemove(['auth_token', 'user_data']);
        }
      }
      
      return {
        capabilities,
        securitySettings,
        user,
        isAuthenticated,
        token,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize auth');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const apiService = ApiService.getInstance();
      
      const response = await apiService.post('/auth/login', credentials);
      const { user, token, refreshToken, expiresIn } = response.data;
      
      // Store auth data
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('refresh_token', refreshToken);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      
      // Set API token
      apiService.setAuthToken(token);
      
      // Calculate session expiry
      const sessionExpiry = Date.now() + (expiresIn * 1000);
      
      return { user, token, sessionExpiry };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

export const authenticateWithBiometrics = createAsyncThunk(
  'auth/authenticateWithBiometrics',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthenticationState };
      const { user } = state.auth;
      
      if (!user) {
        throw new Error('No user data available');
      }
      
      const biometricService = BiometricAuthService.getInstance();
      const success = await biometricService.authenticateWithBiometrics({
        promptTitle: 'Authenticate with YieldRails',
        promptSubtitle: `Welcome back, ${user.email}`,
      });
      
      if (success) {
        const sessionExpiry = Date.now() + (3600 * 1000); // 1 hour
        return { authMethod: 'biometric' as const, sessionExpiry };
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Biometric authentication failed');
    }
  }
);

export const authenticateWithPin = createAsyncThunk(
  'auth/authenticateWithPin',
  async (pin: string, { rejectWithValue }) => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      const success = await biometricService.authenticateWithPin(pin);
      
      if (success) {
        const sessionExpiry = Date.now() + (3600 * 1000); // 1 hour
        return { authMethod: 'pin' as const, sessionExpiry };
      } else {
        throw new Error('Invalid PIN');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'PIN authentication failed');
    }
  }
);

export const enableBiometricAuth = createAsyncThunk(
  'auth/enableBiometricAuth',
  async (_, { rejectWithValue }) => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      const success = await biometricService.enableBiometricAuth();
      
      if (success) {
        return true;
      } else {
        throw new Error('Failed to enable biometric authentication');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to enable biometric auth');
    }
  }
);

export const disableBiometricAuth = createAsyncThunk(
  'auth/disableBiometricAuth',
  async (_, { rejectWithValue }) => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      await biometricService.disableBiometricAuth();
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to disable biometric auth');
    }
  }
);

export const setupPin = createAsyncThunk(
  'auth/setupPin',
  async (pin: string, { rejectWithValue }) => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      const success = await biometricService.setupPinAuth(pin);
      
      if (success) {
        return true;
      } else {
        throw new Error('Failed to setup PIN');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to setup PIN');
    }
  }
);

export const changePin = createAsyncThunk(
  'auth/changePin',
  async ({ oldPin, newPin }: { oldPin: string; newPin: string }, { rejectWithValue }) => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      const success = await biometricService.changePinAuth(oldPin, newPin);
      
      if (success) {
        return true;
      } else {
        throw new Error('Failed to change PIN');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to change PIN');
    }
  }
);

export const disablePin = createAsyncThunk(
  'auth/disablePin',
  async (_, { rejectWithValue }) => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      await biometricService.disablePinAuth();
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to disable PIN');
    }
  }
);

export const updateSecuritySettings = createAsyncThunk(
  'auth/updateSecuritySettings',
  async (settings: Partial<SecuritySettings>, { rejectWithValue }) => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      await biometricService.updateSecuritySettings(settings);
      
      const updatedSettings = await biometricService.getSecuritySettings();
      return updatedSettings;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update security settings');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const apiService = ApiService.getInstance();
      
      // Call logout endpoint
      try {
        await apiService.post('/auth/logout');
      } catch (error) {
        // Continue with local logout even if API call fails
        console.log('Logout API call failed, continuing with local logout');
      }
      
      // Clear stored data
      await AsyncStorage.multiRemove([
        'auth_token',
        'refresh_token',
        'user_data',
        'last_auth_timestamp',
        'last_auth_method',
      ]);
      
      // Clear API token
      apiService.clearAuthToken();
      
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Logout failed');
    }
  }
);

export const checkAuthenticationRequired = createAsyncThunk(
  'auth/checkAuthenticationRequired',
  async (_, { getState }) => {
    try {
      const state = getState() as { auth: AuthenticationState };
      
      if (!state.auth.user) {
        return { required: true, reason: 'no_user' };
      }
      
      const biometricService = BiometricAuthService.getInstance();
      const required = await biometricService.checkAuthenticationRequired();
      
      return { required, reason: required ? 'session_expired' : 'valid_session' };
    } catch (error) {
      return { required: true, reason: 'error' };
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    setSessionExpiry: (state, action: PayloadAction<number>) => {
      state.sessionExpiry = action.payload;
    },
    
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    
    setAuthenticationRequired: (state) => {
      state.isAuthenticated = false;
      state.authMethod = null;
      state.sessionExpiry = null;
    },
  },
  
  extraReducers: (builder) => {
    // Initialize auth
    builder.addCase(initializeAuth.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(initializeAuth.fulfilled, (state, action) => {
      state.loading = false;
      state.biometricAvailable = action.payload.capabilities.isAvailable;
      state.biometricType = action.payload.capabilities.biometryType;
      state.biometricEnabled = action.payload.securitySettings.biometricAuth;
      state.pinEnabled = action.payload.securitySettings.pinAuth;
      state.user = action.payload.user;
      state.isAuthenticated = action.payload.isAuthenticated;
      state.error = null;
    });
    builder.addCase(initializeAuth.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.sessionExpiry = action.payload.sessionExpiry;
      state.authMethod = 'password';
      state.error = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Biometric authentication
    builder.addCase(authenticateWithBiometrics.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(authenticateWithBiometrics.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.authMethod = action.payload.authMethod;
      state.sessionExpiry = action.payload.sessionExpiry;
      state.error = null;
    });
    builder.addCase(authenticateWithBiometrics.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // PIN authentication
    builder.addCase(authenticateWithPin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(authenticateWithPin.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.authMethod = action.payload.authMethod;
      state.sessionExpiry = action.payload.sessionExpiry;
      state.error = null;
    });
    builder.addCase(authenticateWithPin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Enable biometric auth
    builder.addCase(enableBiometricAuth.fulfilled, (state) => {
      state.biometricEnabled = true;
    });
    builder.addCase(enableBiometricAuth.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Disable biometric auth
    builder.addCase(disableBiometricAuth.fulfilled, (state) => {
      state.biometricEnabled = false;
    });
    builder.addCase(disableBiometricAuth.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Setup PIN
    builder.addCase(setupPin.fulfilled, (state) => {
      state.pinEnabled = true;
    });
    builder.addCase(setupPin.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Change PIN
    builder.addCase(changePin.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Disable PIN
    builder.addCase(disablePin.fulfilled, (state) => {
      state.pinEnabled = false;
    });
    builder.addCase(disablePin.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Update security settings
    builder.addCase(updateSecuritySettings.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.authMethod = null;
      state.sessionExpiry = null;
      state.error = null;
    });
    builder.addCase(logout.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Check authentication required
    builder.addCase(checkAuthenticationRequired.fulfilled, (state, action) => {
      if (action.payload.required) {
        state.isAuthenticated = false;
        state.authMethod = null;
        state.sessionExpiry = null;
      }
    });
  },
});

export const {
  clearError,
  setSessionExpiry,
  updateUser,
  setAuthenticationRequired,
} = authSlice.actions;

export default authSlice.reducer;