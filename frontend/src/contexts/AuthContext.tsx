'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: 'USER' | 'MERCHANT' | 'ADMIN';
  walletAddress?: string;
  kycStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  connectWallet: (address: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // In a real app, validate the token with the backend
        // For now, we'll simulate a logged-in user
        setUser({
          id: 'user_123',
          email: 'user@example.com',
          role: 'USER',
          kycStatus: 'APPROVED',
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // In a real app, make an API call to authenticate
      // For now, we'll simulate a successful login
      const mockUser = {
        id: 'user_123',
        email,
        role: 'USER' as const,
        kycStatus: 'APPROVED' as const,
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Store token in localStorage
      localStorage.setItem('auth_token', 'mock_token_123');
      setUser(mockUser);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const connectWallet = async (address: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // In a real app, make an API call to associate wallet with user
      setUser({
        ...user,
        walletAddress: address,
      });
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      // In a real app, fetch updated user data from API
      // For now, just refresh the current user
      await checkAuth();
    } catch (error) {
      console.error('User refresh error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        connectWallet,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}