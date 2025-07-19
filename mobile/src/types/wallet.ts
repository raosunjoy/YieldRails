export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  deepLink: string;
  universalLink: string;
  isInstalled: boolean;
  rdns?: string;
}

export interface ConnectedWallet {
  address: string;
  chainId: number;
  balance: string;
  ensName?: string;
  connector: string;
  isConnected: boolean;
}

export interface WalletTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  chainId: number;
  status: 'pending' | 'success' | 'failed';
  blockNumber?: number;
  timestamp?: number;
}

export interface Web3Config {
  projectId: string;
  chains: Chain[];
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

export interface Chain {
  id: number;
  name: string;
  network: string;
  nativeCurrency: {
    decimals: number;
    name: string;
    symbol: string;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
  testnet?: boolean;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  usdValue?: string;
}

export interface WalletState {
  isInitialized: boolean;
  isConnecting: boolean;
  connectedWallet: ConnectedWallet | null;
  availableWallets: WalletInfo[];
  recentTransactions: WalletTransaction[];
  tokenBalances: TokenBalance[];
  error: string | null;
}