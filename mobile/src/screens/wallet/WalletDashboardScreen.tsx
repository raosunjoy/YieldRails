import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  Chip,
  Divider,
  ActivityIndicator,
  Menu,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@store/index';
import { 
  disconnectWallet, 
  switchChain, 
  refreshBalance, 
  loadTokenBalances,
  clearError 
} from '@store/walletSlice';
import { TokenBalance } from '@types/wallet';

const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', color: '#627eea' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', color: '#8247e5' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', color: '#28a0f0' },
  { id: 8453, name: 'Base', symbol: 'ETH', color: '#0052ff' },
];

const COMMON_TOKENS = [
  '0xA0b86a33E6441419a1e28B08CB6Be6266eb8E9e1', // USDC
  '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
];

export const WalletDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { 
    connectedWallet, 
    tokenBalances, 
    recentTransactions, 
    error 
  } = useSelector((state: RootState) => state.wallet);

  const [refreshing, setRefreshing] = useState(false);
  const [chainMenuVisible, setChainMenuVisible] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (connectedWallet) {
        loadWalletData();
      }
    }, [connectedWallet])
  );

  useEffect(() => {
    if (!connectedWallet) {
      navigation.navigate('WalletConnect');
    }
  }, [connectedWallet, navigation]);

  const loadWalletData = async () => {
    if (!connectedWallet) return;

    setLoadingTokens(true);
    try {
      await Promise.all([
        dispatch(refreshBalance() as any),
        dispatch(loadTokenBalances(COMMON_TOKENS) as any),
      ]);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: () => dispatch(disconnectWallet() as any)
        },
      ]
    );
  };

  const handleChainSwitch = async (chainId: number) => {
    try {
      setChainMenuVisible(false);
      await dispatch(switchChain(chainId) as any).unwrap();
      // Reload data for new chain
      await loadWalletData();
    } catch (error) {
      Alert.alert('Chain Switch Failed', 'Failed to switch blockchain network');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string, decimals = 4) => {
    const num = parseFloat(balance);
    if (num === 0) return '0.00';
    if (num < 0.0001) return '< 0.0001';
    return num.toFixed(decimals);
  };

  const getCurrentChain = () => {
    return SUPPORTED_CHAINS.find(chain => chain.id === connectedWallet?.chainId);
  };

  const getTotalPortfolioValue = (): string => {
    // In a real app, this would calculate USD value using price feeds
    const ethValue = parseFloat(connectedWallet?.balance || '0');
    const tokenValues = tokenBalances.reduce((sum, token) => {
      return sum + parseFloat(token.usdValue || '0');
    }, 0);
    
    return (ethValue * 2000 + tokenValues).toFixed(2); // Mock ETH price
  };

  const renderTokenBalance = (token: TokenBalance) => (
    <View key={token.address} style={styles.tokenItem}>
      <View style={styles.tokenInfo}>
        <Text variant="titleMedium">{token.symbol}</Text>
        <Text variant="bodySmall" style={styles.tokenName}>
          {token.name}
        </Text>
      </View>
      <View style={styles.tokenBalance}>
        <Text variant="titleMedium">
          {formatBalance(token.formattedBalance)}
        </Text>
        {token.usdValue && (
          <Text variant="bodySmall" style={styles.tokenUsdValue}>
            ${formatBalance(token.usdValue, 2)}
          </Text>
        )}
      </View>
    </View>
  );

  const renderRecentTransaction = (tx: any, index: number) => (
    <View key={tx.hash || index} style={styles.transactionItem}>
      <View style={styles.transactionInfo}>
        <View style={styles.transactionHeader}>
          <Chip
            mode="outlined"
            compact
            style={[
              styles.statusChip,
              { borderColor: tx.status === 'success' ? '#4caf50' : '#ff9800' }
            ]}
          >
            {tx.status}
          </Chip>
          <Text variant="bodySmall" style={styles.transactionTime}>
            {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'Pending'}
          </Text>
        </View>
        <Text variant="bodyMedium" numberOfLines={1}>
          To: {formatAddress(tx.to)}
        </Text>
        <Text variant="bodySmall" style={styles.transactionValue}>
          {tx.value} ETH
        </Text>
      </View>
      <IconButton 
        icon="open-in-new" 
        size={16}
        onPress={() => {
          // Open in block explorer
        }}
      />
    </View>
  );

  if (!connectedWallet) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  const currentChain = getCurrentChain();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Wallet Header */}
      <Card style={styles.walletCard}>
        <Card.Content>
          <View style={styles.walletHeader}>
            <View style={styles.walletInfo}>
              <Text variant="titleLarge">Wallet Connected</Text>
              <Text variant="bodyLarge" style={styles.walletAddress}>
                {formatAddress(connectedWallet.address)}
              </Text>
            </View>
            <IconButton 
              icon="logout" 
              onPress={handleDisconnect}
              iconColor="#f44336"
            />
          </View>

          {/* Chain Selector */}
          <View style={styles.chainSelector}>
            <Menu
              visible={chainMenuVisible}
              onDismiss={() => setChainMenuVisible(false)}
              anchor={
                <TouchableOpacity 
                  onPress={() => setChainMenuVisible(true)}
                  style={styles.chainButton}
                >
                  <View style={[styles.chainDot, { backgroundColor: currentChain?.color }]} />
                  <Text variant="titleMedium">{currentChain?.name || 'Unknown Chain'}</Text>
                  <IconButton icon="chevron-down" size={16} />
                </TouchableOpacity>
              }
            >
              {SUPPORTED_CHAINS.map((chain) => (
                <Menu.Item
                  key={chain.id}
                  onPress={() => handleChainSwitch(chain.id)}
                  title={
                    <View style={styles.chainMenuItem}>
                      <View style={[styles.chainDot, { backgroundColor: chain.color }]} />
                      <Text>{chain.name}</Text>
                    </View>
                  }
                />
              ))}
            </Menu>
          </View>
        </Card.Content>
      </Card>

      {/* Portfolio Overview */}
      <Card style={styles.portfolioCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.portfolioTitle}>
            Portfolio Overview
          </Text>
          
          <Text variant="displaySmall" style={styles.portfolioValue}>
            ${getTotalPortfolioValue()}
          </Text>
          
          <View style={styles.portfolioStats}>
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>
                {currentChain?.symbol} Balance
              </Text>
              <Text variant="titleMedium">
                {formatBalance(connectedWallet.balance)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>Tokens</Text>
              <Text variant="titleMedium">{tokenBalances.length}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Token Balances */}
      <Card style={styles.tokensCard}>
        <Card.Content>
          <View style={styles.tokensHeader}>
            <Text variant="titleLarge">Token Balances</Text>
            {loadingTokens && <ActivityIndicator size="small" />}
          </View>
          
          {tokenBalances.length > 0 ? (
            tokenBalances.map(renderTokenBalance)
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">No tokens found</Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Your token balances will appear here
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Recent Transactions */}
      <Card style={styles.transactionsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.transactionsTitle}>
            Recent Transactions
          </Text>
          
          {recentTransactions.length > 0 ? (
            recentTransactions.slice(0, 5).map(renderRecentTransaction)
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">No recent transactions</Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Your transactions will appear here
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('CreatePayment')}
          style={styles.actionButton}
          icon="send"
        >
          Send Payment
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('YieldStrategies')}
          style={styles.actionButton}
          icon="trending-up"
        >
          Earn Yield
        </Button>
      </View>

      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <View style={styles.errorContent}>
              <IconButton icon="alert-circle" iconColor="#f44336" />
              <View style={styles.errorText}>
                <Text variant="titleMedium" style={styles.errorTitle}>Error</Text>
                <Text variant="bodyMedium">{error}</Text>
              </View>
              <IconButton 
                icon="close" 
                onPress={() => dispatch(clearError())}
              />
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  walletCard: {
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletAddress: {
    opacity: 0.7,
    marginTop: 4,
  },
  chainSelector: {
    alignItems: 'flex-start',
  },
  chainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chainDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  chainMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioCard: {
    marginBottom: 16,
  },
  portfolioTitle: {
    marginBottom: 8,
  },
  portfolioValue: {
    color: '#4caf50',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  portfolioStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  tokensCard: {
    marginBottom: 16,
  },
  tokensHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    opacity: 0.7,
    marginTop: 2,
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  tokenUsdValue: {
    opacity: 0.7,
    marginTop: 2,
  },
  transactionsCard: {
    marginBottom: 16,
  },
  transactionsTitle: {
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  transactionTime: {
    opacity: 0.7,
  },
  transactionValue: {
    marginTop: 4,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptySubtext: {
    opacity: 0.7,
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  errorCard: {
    backgroundColor: '#ffebee',
    marginBottom: 16,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
  },
  errorTitle: {
    color: '#f44336',
    marginBottom: 4,
  },
});