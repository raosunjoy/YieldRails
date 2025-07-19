import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  IconButton,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { YieldPortfolio, YieldPerformance } from '@types/yield';
import { YieldService } from '@services/YieldService';

const { width: screenWidth } = Dimensions.get('window');

const PERFORMANCE_PERIODS = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

export const YieldDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const yieldService = YieldService.getInstance();

  const [portfolio, setPortfolio] = useState<YieldPortfolio | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  useEffect(() => {
    if (portfolio) {
      generateChartData();
    }
  }, [portfolio, selectedPeriod]);

  const loadDashboard = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await yieldService.getPortfolio();
      setPortfolio(data);
    } catch (error) {
      console.error('Failed to load yield dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateChartData = () => {
    if (!portfolio) return;

    const selectedPerformance = portfolio.performance.find(p => p.period === selectedPeriod);
    if (!selectedPerformance) return;

    // Mock chart data - in real implementation, this would come from API
    const mockData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          data: [
            parseFloat(portfolio.totalValue) * 0.95,
            parseFloat(portfolio.totalValue) * 0.97,
            parseFloat(portfolio.totalValue) * 0.99,
            parseFloat(portfolio.totalValue) * 1.01,
            parseFloat(portfolio.totalValue) * 1.03,
            parseFloat(portfolio.totalValue) * 1.02,
            parseFloat(portfolio.totalValue),
          ],
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    setChartData(mockData);
  };

  const formatCurrency = (amount: string, decimals = 2) => {
    const num = parseFloat(amount);
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(decimals)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(decimals)}K`;
    }
    return `$${num.toFixed(decimals)}`;
  };

  const formatPercentage = (value: string) => {
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const getPerformanceForPeriod = (): YieldPerformance | null => {
    return portfolio?.performance.find(p => p.period === selectedPeriod) || null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading yield dashboard...</Text>
      </View>
    );
  }

  const currentPerformance = getPerformanceForPeriod();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />
      }
    >
      {/* Portfolio Overview */}
      <Card style={styles.overviewCard}>
        <Card.Content>
          <View style={styles.overviewHeader}>
            <Text variant="headlineSmall">Total Portfolio Value</Text>
            <IconButton
              icon="trending-up"
              size={20}
              iconColor="#4caf50"
            />
          </View>
          
          <Text variant="displaySmall" style={styles.totalValue}>
            {portfolio ? formatCurrency(portfolio.totalValue) : '$0.00'}
          </Text>
          
          <View style={styles.overviewStats}>
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>Total Earned</Text>
              <Text variant="titleMedium" style={styles.earnedValue}>
                +{portfolio ? formatCurrency(portfolio.totalEarned) : '$0.00'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>Average APY</Text>
              <Text variant="titleMedium" style={styles.apyValue}>
                {portfolio ? formatPercentage(portfolio.averageApy) : '0.00%'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Performance Period Selector */}
      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={setSelectedPeriod}
          buttons={PERFORMANCE_PERIODS}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Performance Chart */}
      {chartData && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.chartTitle}>
              Portfolio Performance
            </Text>
            <LineChart
              data={chartData}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#4caf50',
                },
              }}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>
      )}

      {/* Performance Summary */}
      {currentPerformance && (
        <Card style={styles.performanceCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.performanceTitle}>
              {selectedPeriod.toUpperCase()} Performance
            </Text>
            
            <View style={styles.performanceGrid}>
              <View style={styles.performanceItem}>
                <Text variant="bodySmall" style={styles.performanceLabel}>Total Earned</Text>
                <Text variant="titleMedium" style={styles.performanceValue}>
                  +{formatCurrency(currentPerformance.totalEarned)}
                </Text>
              </View>
              
              <View style={styles.performanceItem}>
                <Text variant="bodySmall" style={styles.performanceLabel}>Average APY</Text>
                <Text variant="titleMedium" style={styles.performanceValue}>
                  {formatPercentage(currentPerformance.averageApy)}
                </Text>
              </View>
              
              <View style={styles.performanceItem}>
                <Text variant="bodySmall" style={styles.performanceLabel}>Best Strategy</Text>
                <Text variant="titleMedium" style={styles.performanceValue}>
                  {currentPerformance.bestPerforming.strategyName}
                </Text>
                <Text variant="bodySmall" style={styles.performanceSubtext}>
                  +{formatCurrency(currentPerformance.bestPerforming.yield)}
                </Text>
              </View>
              
              <View style={styles.performanceItem}>
                <Text variant="bodySmall" style={styles.performanceLabel}>Worst Strategy</Text>
                <Text variant="titleMedium" style={styles.performanceValue}>
                  {currentPerformance.worstPerforming.strategyName}
                </Text>
                <Text variant="bodySmall" style={styles.performanceSubtext}>
                  +{formatCurrency(currentPerformance.worstPerforming.yield)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Active Positions */}
      <Card style={styles.positionsCard}>
        <Card.Content>
          <View style={styles.positionsHeader}>
            <Text variant="titleLarge">Active Positions</Text>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('YieldPositions')}
              compact
            >
              View All
            </Button>
          </View>
          
          {portfolio?.positions.slice(0, 3).map((position) => (
            <View key={position.id} style={styles.positionItem}>
              <View style={styles.positionInfo}>
                <Text variant="titleMedium">{position.strategy.name}</Text>
                <Text variant="bodySmall" style={styles.positionProtocol}>
                  {position.strategy.protocol}
                </Text>
              </View>
              
              <View style={styles.positionStats}>
                <Text variant="titleMedium">
                  {formatCurrency(position.amount)} {position.currency}
                </Text>
                <Text variant="bodySmall" style={styles.positionYield}>
                  +{formatCurrency(position.earnedYield)} earned
                </Text>
              </View>
              
              <Chip
                mode="outlined"
                textStyle={{ fontSize: 12 }}
                style={styles.apyChip}
              >
                {formatPercentage(position.currentApy)} APY
              </Chip>
            </View>
          ))}
          
          {!portfolio?.positions.length && (
            <View style={styles.emptyPositions}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No active positions
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Start earning yield by exploring strategies
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('YieldStrategies')}
          style={styles.actionButton}
          icon="trending-up"
        >
          Explore Strategies
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('YieldSimulator')}
          style={styles.actionButton}
          icon="calculator"
        >
          Yield Simulator
        </Button>
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
  overviewCard: {
    marginBottom: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalValue: {
    color: '#4caf50',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  overviewStats: {
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
  earnedValue: {
    color: '#4caf50',
  },
  apyValue: {
    color: '#2196f3',
  },
  periodSelector: {
    marginBottom: 16,
  },
  segmentedButtons: {
    backgroundColor: '#ffffff',
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  performanceCard: {
    marginBottom: 16,
  },
  performanceTitle: {
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  performanceItem: {
    flex: 1,
    minWidth: '45%',
  },
  performanceLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  performanceValue: {
    marginBottom: 2,
  },
  performanceSubtext: {
    opacity: 0.6,
  },
  positionsCard: {
    marginBottom: 16,
  },
  positionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  positionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  positionInfo: {
    flex: 1,
  },
  positionProtocol: {
    opacity: 0.7,
    marginTop: 2,
  },
  positionStats: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  positionYield: {
    color: '#4caf50',
    marginTop: 2,
  },
  apyChip: {
    alignSelf: 'center',
  },
  emptyPositions: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginBottom: 8,
  },
  emptySubtext: {
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
});