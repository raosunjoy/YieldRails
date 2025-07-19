import { Core } from '@walletconnect/core';
import { Web3Wallet, IWeb3Wallet } from '@walletconnect/web3wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { 
  WalletInfo, 
  ConnectedWallet, 
  WalletTransaction, 
  Web3Config, 
  TokenBalance,
  Chain 
} from '@types/wallet';

export class WalletService {
  private static instance: WalletService;
  private web3wallet: IWeb3Wallet | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private connectedWallet: ConnectedWallet | null = null;

  private constructor() {}

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const core = new Core({
        projectId: Config.WALLET_CONNECT_PROJECT_ID || '',
        relayUrl: Config.WALLET_CONNECT_RELAY_URL || 'wss://relay.walletconnect.com',
      });

      this.web3wallet = await Web3Wallet.init({
        core,
        metadata: {
          name: 'YieldRails',
          description: 'DeFi yield optimization and cross-chain payments',
          url: 'https://yieldrails.com',
          icons: ['https://yieldrails.com/logo.png'],
        },
      });

      // Set up event listeners
      this.setupEventListeners();

      // Restore previous session if exists
      await this.restoreSession();
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      throw new Error('Failed to initialize wallet service');
    }
  }

  private setupEventListeners(): void {
    if (!this.web3wallet) return;

    this.web3wallet.on('session_proposal', async (proposal) => {
      console.log('Session proposal received:', proposal);
      // Handle session proposal - approve or reject based on app logic
      await this.handleSessionProposal(proposal);
    });

    this.web3wallet.on('session_request', async (requestEvent) => {
      console.log('Session request received:', requestEvent);
      // Handle session requests (sign transactions, etc.)
      await this.handleSessionRequest(requestEvent);
    });

    this.web3wallet.on('session_delete', (sessionEvent) => {
      console.log('Session deleted:', sessionEvent);
      this.handleSessionDelete();
    });
  }

  private async handleSessionProposal(proposal: any): Promise<void> {
    try {
      // Build approved namespaces based on required namespaces
      const approvedNamespaces = buildApprovedNamespaces({
        proposal: proposal.params,
        supportedNamespaces: {
          eip155: {
            chains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:8453'], // Ethereum, Polygon, Arbitrum, Base
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction',
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
            ],
            events: ['chainChanged', 'accountsChanged'],
            accounts: this.connectedWallet ? [`eip155:1:${this.connectedWallet.address}`] : [],
          },
        },
      });

      await this.web3wallet?.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      });
    } catch (error) {
      console.error('Failed to approve session:', error);
      await this.web3wallet?.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED'),
      });
    }
  }

  private async handleSessionRequest(requestEvent: any): Promise<void> {
    const { topic, params, id } = requestEvent;
    const { request } = params;

    try {
      let result;

      switch (request.method) {
        case 'eth_sendTransaction':
          result = await this.sendTransaction(request.params[0]);
          break;
        case 'eth_signTransaction':
          result = await this.signTransaction(request.params[0]);
          break;
        case 'personal_sign':
          result = await this.personalSign(request.params[0], request.params[1]);
          break;
        case 'eth_signTypedData':
          result = await this.signTypedData(request.params[1], request.params[0]);
          break;
        default:
          throw new Error(`Unsupported method: ${request.method}`);
      }

      await this.web3wallet?.respondSessionRequest({
        topic,
        response: {
          id,
          result,
          jsonrpc: '2.0',
        },
      });
    } catch (error) {
      console.error('Failed to handle session request:', error);
      await this.web3wallet?.respondSessionRequest({
        topic,
        response: {
          id,
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          jsonrpc: '2.0',
        },
      });
    }
  }

  private handleSessionDelete(): void {
    this.connectedWallet = null;
    AsyncStorage.removeItem('connected_wallet');
  }

  async connectWallet(walletInfo: WalletInfo): Promise<ConnectedWallet> {
    try {
      if (!this.web3wallet) {
        throw new Error('Wallet service not initialized');
      }

      // For mobile, we'll simulate wallet connection
      // In a real implementation, this would integrate with the specific wallet's mobile SDK
      const mockAddress = '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234'; // Mock address
      const chainId = 1; // Ethereum mainnet

      // Set up provider for the connected chain
      await this.setupProvider(chainId);

      // Get balance
      const balance = await this.getBalance(mockAddress);

      const connectedWallet: ConnectedWallet = {
        address: mockAddress,
        chainId,
        balance,
        connector: walletInfo.name,
        isConnected: true,
      };

      this.connectedWallet = connectedWallet;
      await AsyncStorage.setItem('connected_wallet', JSON.stringify(connectedWallet));

      return connectedWallet;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw new Error('Failed to connect wallet');
    }
  }

  async disconnectWallet(): Promise<void> {
    try {
      if (this.web3wallet) {
        const sessions = this.web3wallet.getActiveSessions();
        for (const session of Object.values(sessions)) {
          await this.web3wallet.disconnectSession({
            topic: session.topic,
            reason: getSdkError('USER_DISCONNECTED'),
          });
        }
      }

      this.connectedWallet = null;
      this.provider = null;
      this.signer = null;
      await AsyncStorage.removeItem('connected_wallet');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw new Error('Failed to disconnect wallet');
    }
  }

  async setupProvider(chainId: number): Promise<void> {
    const rpcUrls = this.getRpcUrls(chainId);
    this.provider = new ethers.JsonRpcProvider(rpcUrls[0]);
  }

  private getRpcUrls(chainId: number): string[] {
    switch (chainId) {
      case 1: // Ethereum
        return [Config.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo'];
      case 137: // Polygon
        return [Config.POLYGON_RPC_URL || 'https://polygon-mainnet.alchemyapi.io/v2/demo'];
      case 42161: // Arbitrum
        return [Config.ARBITRUM_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo'];
      case 8453: // Base
        return [Config.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/demo'];
      default:
        return [Config.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo'];
    }
  }

  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0.0';
    }
  }

  async getTokenBalances(address: string, tokenAddresses: string[]): Promise<TokenBalance[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const balances: TokenBalance[] = [];

    for (const tokenAddress of tokenAddresses) {
      try {
        // ERC-20 ABI for balanceOf and token info
        const erc20Abi = [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)',
          'function name() view returns (string)',
        ];

        const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
        
        const [balance, decimals, symbol, name] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
          contract.symbol(),
          contract.name(),
        ]);

        const formattedBalance = ethers.formatUnits(balance, decimals);

        balances.push({
          address: tokenAddress,
          symbol,
          name,
          decimals,
          balance: balance.toString(),
          formattedBalance,
        });
      } catch (error) {
        console.error(`Failed to get balance for token ${tokenAddress}:`, error);
      }
    }

    return balances;
  }

  async sendTransaction(transactionRequest: any): Promise<string> {
    if (!this.provider || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.signer.sendTransaction(transactionRequest);
      return tx.hash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw new Error('Failed to send transaction');
    }
  }

  async signTransaction(transactionRequest: any): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTx = await this.signer.signTransaction(transactionRequest);
      return signedTx;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw new Error('Failed to sign transaction');
    }
  }

  async personalSign(message: string, address: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw new Error('Failed to sign message');
    }
  }

  async signTypedData(domain: any, types: any, value: any): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.signer.signTypedData(domain, types, value);
      return signature;
    } catch (error) {
      console.error('Failed to sign typed data:', error);
      throw new Error('Failed to sign typed data');
    }
  }

  async switchChain(chainId: number): Promise<void> {
    try {
      await this.setupProvider(chainId);
      
      if (this.connectedWallet) {
        this.connectedWallet.chainId = chainId;
        await AsyncStorage.setItem('connected_wallet', JSON.stringify(this.connectedWallet));
      }
    } catch (error) {
      console.error('Failed to switch chain:', error);
      throw new Error('Failed to switch chain');
    }
  }

  async restoreSession(): Promise<ConnectedWallet | null> {
    try {
      const savedWallet = await AsyncStorage.getItem('connected_wallet');
      if (savedWallet) {
        this.connectedWallet = JSON.parse(savedWallet);
        if (this.connectedWallet) {
          await this.setupProvider(this.connectedWallet.chainId);
        }
        return this.connectedWallet;
      }
      return null;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return null;
    }
  }

  getConnectedWallet(): ConnectedWallet | null {
    return this.connectedWallet;
  }

  getAvailableWallets(): WalletInfo[] {
    return [
      {
        id: 'metamask',
        name: 'MetaMask',
        icon: 'https://docs.walletconnect.com/assets/metamask.png',
        deepLink: 'metamask://wc',
        universalLink: 'https://metamask.app.link/wc',
        isInstalled: true, // Would check actual installation status
        rdns: 'io.metamask',
      },
      {
        id: 'trust',
        name: 'Trust Wallet',
        icon: 'https://docs.walletconnect.com/assets/trust.png',
        deepLink: 'trust://wc',
        universalLink: 'https://link.trustwallet.com/wc',
        isInstalled: true,
        rdns: 'com.trustwallet.app',
      },
      {
        id: 'rainbow',
        name: 'Rainbow',
        icon: 'https://docs.walletconnect.com/assets/rainbow.png',
        deepLink: 'rainbow://wc',
        universalLink: 'https://rnbwapp.com/wc',
        isInstalled: false,
        rdns: 'me.rainbow',
      },
      {
        id: 'coinbase',
        name: 'Coinbase Wallet',
        icon: 'https://docs.walletconnect.com/assets/coinbase.png',
        deepLink: 'cbwallet://wc',
        universalLink: 'https://go.cb-w.com/wc',
        isInstalled: false,
        rdns: 'com.coinbase.wallet',
      },
    ];
  }
}