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
  ActivityIndicator,
  Badge,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { YieldStrategy } from '@types/yield';
import { YieldService } from '@services/YieldService';

const RISK_COLORS = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
};

const RISK_LABELS = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

export const YieldStrategiesScreen: React.FC = () => {
  const navigation = useNavigation();
  const yieldService = YieldService.getInstance();

  const [strategies, setStrategies] = useState<YieldStrategy[]>([]);
  const [filteredStrategies, setFilteredStrategies] = useState<YieldStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'apy' | 'tvl' | 'name'>('apy');
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStrategies();
    }, [])
  );

  useEffect(() => {
    filterAndSortStrategies();
  }, [strategies, searchQuery, selectedRiskLevel, sortBy]);

  const loadStrategies = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await yieldService.getStrategies();
      setStrategies(data.filter(strategy => strategy.isActive));
    } catch (error) {
      console.error('Failed to load strategies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAndSortStrategies = () => {
    let filtered = strategies;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (strategy) =>
          strategy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          strategy.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          strategy.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply risk level filter
    if (selectedRiskLevel) {
      filtered = filtered.filter(strategy => strategy.riskLevel === selectedRiskLevel);
    }

    // Sort strategies
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'apy':
          return parseFloat(b.apy) - parseFloat(a.apy);
        case 'tvl':
          return parseFloat(b.tvl) - parseFloat(a.tvl);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredStrategies(filtered);
  };

  const formatCurrency = (amount: string, compact = true) => {
    const num = parseFloat(amount);
    if (compact) {
      if (num >= 1000000000) {
        return `$${(num / 1000000000).toFixed(1)}B`;
      } else if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(1)}M`;
      } else if (num >= 1000) {
        return `$${(num / 1000).toFixed(1)}K`;
      }
    }
    return `$${num.toFixed(2)}`;
  };

  const formatPercentage = (value: string) => {
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const renderStrategyItem = ({ item }: { item: YieldStrategy }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('StrategyDetails', { strategyId: item.id })}
    >
      <Card style={styles.strategyCard}>
        <Card.Content>
          <View style={styles.strategyHeader}>
            <View style={styles.strategyInfo}>
              <Text variant="titleLarge">{item.name}</Text>
              <Text variant="bodyMedium" style={styles.protocolText}>
                {item.protocol}
              </Text>
            </View>
            <View style={styles.strategyMetrics}>
              <Text variant="headlineSmall" style={styles.apyText}>
                {formatPercentage(item.apy)}
              </Text>
              <Text variant="bodySmall" style={styles.apyLabel}>
                APY
              </Text>
            </View>
          </View>

          <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.strategyDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text variant="bodySmall" style={styles.detailLabel}>TVL</Text>
                <Text variant="titleSmall">{formatCurrency(item.tvl)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text variant="bodySmall" style={styles.detailLabel}>Min Deposit</Text>
                <Text variant="titleSmall">{formatCurrency(item.minimumDeposit)}</Text>
              </View>
              {item.lockupPeriod && (
                <View style={styles.detailItem}>
                  <Text variant="bodySmall" style={styles.detailLabel}>Lockup</Text>
                  <Text variant="titleSmall">{item.lockupPeriod}</Text>
                </View>
              )}
            </View>

            <View style={styles.chipRow}>
              <Chip
                mode="outlined"
                textStyle={{ color: RISK_COLORS[item.riskLevel] }}
                style={[styles.riskChip, { borderColor: RISK_COLORS[item.riskLevel] }]}
                compact
              >
                {RISK_LABELS[item.riskLevel]}
              </Chip>
              
              <View style={styles.tokenChips}>
                {item.supportedTokens.slice(0, 3).map((token) => (
                  <Chip key={token} mode="outlined" compact style={styles.tokenChip}>
                    {token}
                  </Chip>
                ))}
                {item.supportedTokens.length > 3 && (
                  <Chip mode="outlined" compact style={styles.tokenChip}>
                    +{item.supportedTokens.length - 3}
                  </Chip>
                )}
              </View>
            </View>

            <View style={styles.feeRow}>
              <Text variant="bodySmall" style={styles.feeText}>
                Management: {formatPercentage(item.fees.management)} • 
                Performance: {formatPercentage(item.fees.performance)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Strategies Found
      </Text>
      <Text variant="bodyMedium" style={styles.emptyDescription}>
        Try adjusting your search or filter criteria.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading strategies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search strategies..."
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
          <Menu.Item onPress={() => setSortBy('apy')} title="Sort by APY" />
          <Menu.Item onPress={() => setSortBy('tvl')} title="Sort by TVL" />
          <Menu.Item onPress={() => setSortBy('name')} title="Sort by Name" />
          <Divider />
          <Menu.Item 
            onPress={() => setSelectedRiskLevel(selectedRiskLevel === 'low' ? null : 'low')} 
            title={`Low Risk ${selectedRiskLevel === 'low' ? '✓' : ''}`}
          />
          <Menu.Item 
            onPress={() => setSelectedRiskLevel(selectedRiskLevel === 'medium' ? null : 'medium')} 
            title={`Medium Risk ${selectedRiskLevel === 'medium' ? '✓' : ''}`}
          />
          <Menu.Item 
            onPress={() => setSelectedRiskLevel(selectedRiskLevel === 'high' ? null : 'high')} 
            title={`High Risk ${selectedRiskLevel === 'high' ? '✓' : ''}`}
          />
          <Divider />
          <Menu.Item 
            onPress={() => {
              setSelectedRiskLevel(null);
              setSearchQuery('');
              setSortBy('apy');
            }} 
            title="Clear All Filters" 
          />
        </Menu>
      </View>

      {/* Filter indicators */}
      {(selectedRiskLevel || searchQuery) && (
        <View style={styles.filterIndicators}>
          {selectedRiskLevel && (
            <Chip
              mode="flat"
              onClose={() => setSelectedRiskLevel(null)}
              style={styles.filterChip}
            >
              {RISK_LABELS[selectedRiskLevel as keyof typeof RISK_LABELS]}
            </Chip>
          )}
          {searchQuery && (
            <Chip
              mode="flat"
              onClose={() => setSearchQuery('')}
              style={styles.filterChip}
            >
              "{searchQuery}"
            </Chip>
          )}
        </View>
      )}

      <FlatList
        data={filteredStrategies}
        renderItem={renderStrategyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadStrategies(true)} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="calculator"
        style={styles.fab}
        onPress={() => navigation.navigate('YieldSimulator')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    flex: 1,
    marginRight: 8,
  },
  filterIndicators: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#e3f2fd',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  strategyCard: {
    marginBottom: 12,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  strategyInfo: {
    flex: 1,
  },
  protocolText: {
    opacity: 0.7,
    marginTop: 2,
  },
  strategyMetrics: {
    alignItems: 'flex-end',
  },
  apyText: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  apyLabel: {
    opacity: 0.7,
  },
  description: {
    marginBottom: 12,
    opacity: 0.8,
  },
  strategyDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    opacity: 0.7,
    marginBottom: 2,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskChip: {
    borderWidth: 1,
  },
  tokenChips: {
    flexDirection: 'row',
    gap: 4,
  },
  tokenChip: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  feeRow: {
    marginTop: 4,
  },
  feeText: {
    opacity: 0.6,
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