import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  Chip,
  IconButton,
  Searchbar,
  FAB,
  Menu,
  Divider,
  Badge,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Payment, PaymentFilter } from '@types/payment';
import { PaymentService } from '@services/PaymentService';

const STATUS_COLORS = {
  pending: '#ff9800',
  processing: '#2196f3',
  completed: '#4caf50',
  failed: '#f44336',
  cancelled: '#9e9e9e',
};

const TYPE_LABELS = {
  standard: 'Standard',
  yield_optimized: 'Yield+',
  cross_chain: 'Cross Chain',
};

export const PaymentHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const paymentService = PaymentService.getInstance();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<PaymentFilter>({});
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [])
  );

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, filter]);

  const loadPayments = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await paymentService.getPayments(filter);
      setPayments(data);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchQuery) {
      filtered = filtered.filter(
        (payment) =>
          payment.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
          payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          payment.transactionHash?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  };

  const handleFilterChange = (newFilter: Partial<PaymentFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    loadPayments();
  };

  const clearFilters = () => {
    setFilter({});
    setSearchQuery('');
    loadPayments();
  };

  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M ${currency}`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K ${currency}`;
    }
    return `${num.toFixed(4)} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('PaymentDetails', { paymentId: item.id })}
    >
      <Card style={styles.paymentCard}>
        <Card.Content>
          <View style={styles.paymentHeader}>
            <View style={styles.paymentInfo}>
              <Text variant="titleMedium">{formatAmount(item.amount, item.currency)}</Text>
              <Text variant="bodySmall" numberOfLines={1}>
                To: {item.recipient.slice(0, 6)}...{item.recipient.slice(-4)}
              </Text>
            </View>
            <View style={styles.paymentStatus}>
              <Chip
                icon={getStatusIcon(item.status)}
                textStyle={{ color: STATUS_COLORS[item.status] }}
                style={[styles.statusChip, { borderColor: STATUS_COLORS[item.status] }]}
                mode="outlined"
              >
                {item.status}
              </Chip>
            </View>
          </View>

          <View style={styles.paymentDetails}>
            <View style={styles.paymentMeta}>
              <Chip mode="outlined" compact style={styles.typeChip}>
                {TYPE_LABELS[item.type]}
              </Chip>
              <Text variant="bodySmall">{formatDate(item.createdAt)}</Text>
            </View>

            {item.actualYield && parseFloat(item.actualYield) > 0 && (
              <View style={styles.yieldContainer}>
                <Badge style={styles.yieldBadge}>
                  +{item.actualYield} {item.currency} yield
                </Badge>
              </View>
            )}

            {item.type === 'cross_chain' && item.sourceChain && item.targetChain && (
              <View style={styles.chainInfo}>
                <Text variant="bodySmall">
                  {item.sourceChain} → {item.targetChain}
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Payments Found
      </Text>
      <Text variant="bodyMedium" style={styles.emptyDescription}>
        You haven't made any payments yet. Create your first payment to get started.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search payments..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="filter-variant"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item onPress={() => handleFilterChange({ status: 'completed' })} title="Completed" />
          <Menu.Item onPress={() => handleFilterChange({ status: 'pending' })} title="Pending" />
          <Menu.Item onPress={() => handleFilterChange({ status: 'failed' })} title="Failed" />
          <Divider />
          <Menu.Item onPress={() => handleFilterChange({ type: 'yield_optimized' })} title="Yield Optimized" />
          <Menu.Item onPress={() => handleFilterChange({ type: 'cross_chain' })} title="Cross Chain" />
          <Divider />
          <Menu.Item onPress={clearFilters} title="Clear Filters" />
        </Menu>
      </View>

      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadPayments(true)} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePayment')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    flex: 1,
    marginRight: 8,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  paymentCard: {
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentStatus: {
    alignItems: 'flex-end',
  },
  statusChip: {
    borderWidth: 1,
  },
  paymentDetails: {
    gap: 8,
  },
  paymentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  yieldContainer: {
    alignItems: 'flex-start',
  },
  yieldBadge: {
    backgroundColor: '#e8f5e8',
    color: '#4caf50',
  },
  chainInfo: {
    alignItems: 'flex-start',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});