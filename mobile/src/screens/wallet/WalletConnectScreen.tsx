import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  IconButton,
  Divider,
  Chip,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@store/index';
import { connectWallet, initializeWallet } from '@store/walletSlice';
import { WalletInfo } from '@types/wallet';

export const WalletConnectScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { 
    isInitialized,
    isConnecting, 
    connectedWallet, 
    availableWallets, 
    error 
  } = useSelector((state: RootState) => state.wallet);

  const [selectedWallet, setSelectedWallet] = useState<WalletInfo | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      dispatch(initializeWallet() as any);
    }
  }, [dispatch, isInitialized]);

  useEffect(() => {
    if (connectedWallet) {
      navigation.goBack();
    }
  }, [connectedWallet, navigation]);

  const handleWalletSelect = async (wallet: WalletInfo) => {
    setSelectedWallet(wallet);
    
    if (!wallet.isInstalled) {
      Alert.alert(
        'Wallet Not Installed',
        `${wallet.name} is not installed on your device. Would you like to install it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Install', 
            onPress: () => handleWalletInstall(wallet)
          },
        ]
      );
      return;
    }

    try {
      await dispatch(connectWallet(wallet) as any).unwrap();
    } catch (error) {
      Alert.alert('Connection Failed', 'Failed to connect to wallet. Please try again.');
      setSelectedWallet(null);
    }
  };

  const handleWalletInstall = async (wallet: WalletInfo) => {
    try {
      const installUrl = getWalletInstallUrl(wallet);
      if (installUrl) {
        await Linking.openURL(installUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open wallet installation page');
    }
  };

  const getWalletInstallUrl = (wallet: WalletInfo): string | null => {
    switch (wallet.id) {
      case 'metamask':
        return 'https://metamask.io/download/';
      case 'trust':
        return 'https://trustwallet.com/download';
      case 'rainbow':
        return 'https://rainbow.me/download';
      case 'coinbase':
        return 'https://www.coinbase.com/wallet';
      default:
        return null;
    }
  };

  const renderWalletItem = (wallet: WalletInfo) => (
    <TouchableOpacity
      key={wallet.id}
      onPress={() => handleWalletSelect(wallet)}
      disabled={isConnecting && selectedWallet?.id === wallet.id}
    >
      <Card style={[
        styles.walletCard,
        selectedWallet?.id === wallet.id && styles.selectedWalletCard
      ]}>
        <Card.Content style={styles.walletContent}>
          <View style={styles.walletInfo}>
            <View style={styles.walletIcon}>
              <Image 
                source={{ uri: wallet.icon }} 
                style={styles.iconImage}
                defaultSource={require('../../assets/wallet-placeholder.png')}
              />
            </View>
            <View style={styles.walletDetails}>
              <Text variant="titleMedium">{wallet.name}</Text>
              <View style={styles.walletStatus}>
                <Chip
                  mode="outlined"
                  compact
                  style={[
                    styles.statusChip,
                    wallet.isInstalled ? styles.installedChip : styles.notInstalledChip
                  ]}
                >
                  {wallet.isInstalled ? 'Installed' : 'Not Installed'}
                </Chip>
              </View>
            </View>
          </View>
          
          <View style={styles.walletActions}>
            {isConnecting && selectedWallet?.id === wallet.id ? (
              <ActivityIndicator size="small" />
            ) : (
              <IconButton 
                icon="chevron-right" 
                size={20}
              />
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Initializing wallet service...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Connect Wallet
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Choose a wallet to connect to YieldRails and start earning yield on your crypto
        </Text>
      </View>

      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <View style={styles.errorContent}>
              <IconButton icon="alert-circle" iconColor="#f44336" />
              <View style={styles.errorText}>
                <Text variant="titleMedium" style={styles.errorTitle}>
                  Connection Error
                </Text>
                <Text variant="bodyMedium">{error}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <View style={styles.walletsSection}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Available Wallets
        </Text>
        
        {availableWallets.map(renderWalletItem)}
      </View>

      <Divider style={styles.divider} />

      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoHeader}>
            <IconButton icon="information" iconColor="#2196f3" />
            <Text variant="titleMedium">Why Connect a Wallet?</Text>
          </View>
          
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <IconButton icon="check-circle" size={16} iconColor="#4caf50" />
              <Text variant="bodyMedium">Make secure payments and transfers</Text>
            </View>
            <View style={styles.infoItem}>
              <IconButton icon="check-circle" size={16} iconColor="#4caf50" />
              <Text variant="bodyMedium">Earn yield on your crypto holdings</Text>
            </View>
            <View style={styles.infoItem}>
              <IconButton icon="check-circle" size={16} iconColor="#4caf50" />
              <Text variant="bodyMedium">Access cross-chain DeFi strategies</Text>
            </View>
            <View style={styles.infoItem}>
              <IconButton icon="check-circle" size={16} iconColor="#4caf50" />
              <Text variant="bodyMedium">Track your portfolio performance</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.securityNotice}>
        <IconButton icon="shield-check" iconColor="#4caf50" />
        <Text variant="bodySmall" style={styles.securityText}>
          Your wallet credentials are never stored on our servers. All transactions are signed locally on your device.
        </Text>
      </View>
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
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 16,
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#ffebee',
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
  walletsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  walletCard: {
    marginBottom: 12,
  },
  selectedWalletCard: {
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  walletContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletIcon: {
    marginRight: 16,
  },
  iconImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  walletDetails: {
    flex: 1,
  },
  walletStatus: {
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  installedChip: {
    borderColor: '#4caf50',
  },
  notInstalledChip: {
    borderColor: '#ff9800',
  },
  walletActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    marginVertical: 24,
  },
  infoCard: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  securityText: {
    flex: 1,
    opacity: 0.7,
    lineHeight: 20,
  },
});