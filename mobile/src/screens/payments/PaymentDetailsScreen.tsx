import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Share,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  IconButton,
  Divider,
  ActivityIndicator,
  Badge,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Payment } from '@types/payment';
import { PaymentService } from '@services/PaymentService';

interface PaymentDetailsRouteParams {
  paymentId: string;
}

const STATUS_COLORS = {
  pending: '#ff9800',
  processing: '#2196f3',
  completed: '#4caf50',
  failed: '#f44336',
  cancelled: '#9e9e9e',
};

const CHAIN_EXPLORERS = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
  base: 'https://basescan.org/tx/',
};

export const PaymentDetailsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { paymentId } = route.params as PaymentDetailsRouteParams;
  const paymentService = PaymentService.getInstance();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadPayment();
  }, [paymentId]);

  const loadPayment = async () => {
    setLoading(true);
    try {
      const data = await paymentService.getPayment(paymentId);
      setPayment(data);
    } catch (error) {
      console.error('Failed to load payment:', error);
      Alert.alert('Error', 'Failed to load payment details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!payment) return;

    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await paymentService.cancelPayment(payment.id);
              Alert.alert('Success', 'Payment has been cancelled');
              loadPayment();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel payment');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleViewOnExplorer = () => {
    if (!payment?.transactionHash || !payment.sourceChain) return;

    const explorerUrl = CHAIN_EXPLORERS[payment.sourceChain as keyof typeof CHAIN_EXPLORERS];
    if (explorerUrl) {
      Linking.openURL(explorerUrl + payment.transactionHash);
    }
  };

  const handleShare = async () => {
    if (!payment) return;

    try {
      const message = `Payment Details:\n\nAmount: ${payment.amount} ${payment.currency}\nStatus: ${payment.status}\nRecipient: ${payment.recipient}\nTransaction: ${payment.transactionHash || 'Pending'}`;
      
      await Share.share({
        message,
        title: 'YieldRails Payment Details',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'failed':
        return 'close-circle';
      case 'pending':
        return 'clock';
      case 'processing':
        return 'progress-clock';
      case 'cancelled':
        return 'cancel';
      default:
        return 'help-circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.errorContainer}>
        <Text>Payment not found</Text>
      </View>
    );
  }

  const canCancel = payment.status === 'pending' || payment.status === 'processing';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text variant="headlineMedium">
                {payment.amount} {payment.currency}
              </Text>
              <Text variant="bodyLarge" style={styles.recipientText}>
                To: {payment.recipient}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <IconButton icon="share" onPress={handleShare} />
              {payment.transactionHash && (
                <IconButton icon="open-in-new" onPress={handleViewOnExplorer} />
              )}
            </View>
          </View>

          <View style={styles.statusContainer}>
            <Chip
              icon={getStatusIcon(payment.status)}
              textStyle={{ color: STATUS_COLORS[payment.status] }}
              style={[styles.statusChip, { borderColor: STATUS_COLORS[payment.status] }]}
              mode="outlined"
            >
              {payment.status.toUpperCase()}
            </Chip>

            {payment.actualYield && parseFloat(payment.actualYield) > 0 && (
              <Badge style={styles.yieldBadge}>
                +{payment.actualYield} {payment.currency} yield earned
              </Badge>
            )}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.detailsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Payment Details
          </Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment ID</Text>
            <Text style={styles.detailValue}>{payment.id}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>
              {payment.type === 'standard' && 'Standard Payment'}
              {payment.type === 'yield_optimized' && 'Yield Optimized'}
              {payment.type === 'cross_chain' && 'Cross Chain'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{formatDate(payment.createdAt)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated</Text>
            <Text style={styles.detailValue}>{formatDate(payment.updatedAt)}</Text>
          </View>

          {payment.transactionHash && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Hash</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {payment.transactionHash}
                </Text>
              </View>
            </>
          )}

          {payment.type === 'cross_chain' && payment.sourceChain && payment.targetChain && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source Chain</Text>
                <Text style={styles.detailValue}>{payment.sourceChain}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Target Chain</Text>
                <Text style={styles.detailValue}>{payment.targetChain}</Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {(payment.gasFee || payment.bridgeFee || payment.estimatedYield) && (
        <Card style={styles.feesCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Fees & Yield
            </Text>

            {payment.gasFee && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gas Fee</Text>
                <Text style={styles.detailValue}>{payment.gasFee} ETH</Text>
              </View>
            )}

            {payment.bridgeFee && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bridge Fee</Text>
                <Text style={styles.detailValue}>{payment.bridgeFee} {payment.currency}</Text>
              </View>
            )}

            {payment.estimatedYield && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estimated Yield</Text>
                <Text style={[styles.detailValue, styles.yieldText]}>
                  +{payment.estimatedYield} {payment.currency}
                </Text>
              </View>
            )}

            {payment.actualYield && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Actual Yield</Text>
                <Text style={[styles.detailValue, styles.yieldText]}>
                  +{payment.actualYield} {payment.currency}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {canCancel && (
        <Button
          mode="outlined"
          onPress={handleCancelPayment}
          loading={cancelling}
          disabled={cancelling}
          style={styles.cancelButton}
          buttonColor="#fff"
          textColor="#f44336"
        >
          Cancel Payment
        </Button>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  recipientText: {
    marginTop: 4,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusChip: {
    borderWidth: 1,
  },
  yieldBadge: {
    backgroundColor: '#e8f5e8',
    color: '#4caf50',
  },
  detailsCard: {
    marginBottom: 16,
  },
  feesCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    flex: 1,
    opacity: 0.7,
  },
  detailValue: {
    flex: 2,
    textAlign: 'right',
  },
  yieldText: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  cancelButton: {
    marginTop: 8,
    borderColor: '#f44336',
  },
});