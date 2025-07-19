import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Chip,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PaymentRequest } from '@types/payment';
import { PaymentService } from '@services/PaymentService';

const CURRENCIES = ['USDC', 'USDT', 'DAI', 'ETH', 'MATIC'];
const CHAINS = [
  { label: 'Ethereum', value: 'ethereum' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Arbitrum', value: 'arbitrum' },
  { label: 'Base', value: 'base' },
];

export const CreatePaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const paymentService = PaymentService.getInstance();

  const [formData, setFormData] = useState<PaymentRequest>({
    amount: '',
    currency: 'USDC',
    recipient: '',
    type: 'standard',
    memo: '',
    sourceChain: 'ethereum',
    targetChain: 'ethereum',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [feeEstimate, setFeeEstimate] = useState<{
    gasFee: string;
    bridgeFee?: string;
    estimatedYield?: string;
  } | null>(null);
  const [estimatingFees, setEstimatingFees] = useState(false);

  const paymentTypes = [
    { value: 'standard', label: 'Standard' },
    { value: 'yield_optimized', label: 'Yield Optimized' },
    { value: 'cross_chain', label: 'Cross Chain' },
  ];

  useEffect(() => {
    if (formData.amount && formData.currency && formData.recipient) {
      estimateFees();
    }
  }, [formData.amount, formData.currency, formData.type, formData.sourceChain, formData.targetChain]);

  const estimateFees = async () => {
    if (!formData.amount || !formData.currency || !formData.recipient) return;

    setEstimatingFees(true);
    try {
      const estimate = await paymentService.estimatePaymentFees({
        amount: formData.amount,
        currency: formData.currency,
        recipient: formData.recipient,
        type: formData.type,
        sourceChain: formData.sourceChain,
        targetChain: formData.targetChain,
      });
      setFeeEstimate(estimate);
    } catch (error) {
      console.error('Failed to estimate fees:', error);
    } finally {
      setEstimatingFees(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!formData.recipient) {
      newErrors.recipient = 'Recipient address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.recipient)) {
      newErrors.recipient = 'Please enter a valid Ethereum address';
    }

    if (formData.type === 'cross_chain' && formData.sourceChain === formData.targetChain) {
      newErrors.targetChain = 'Target chain must be different from source chain';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const payment = await paymentService.createPayment(formData);
      Alert.alert(
        'Payment Created',
        `Payment of ${formData.amount} ${formData.currency} has been created successfully.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof PaymentRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Create Payment
            </Text>

            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Payment Type
              </Text>
              <SegmentedButtons
                value={formData.type}
                onValueChange={(value) => updateFormData('type', value)}
                buttons={paymentTypes}
                style={styles.segmentedButtons}
              />
            </View>

            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Amount & Currency
              </Text>
              <View style={styles.row}>
                <TextInput
                  label="Amount"
                  value={formData.amount}
                  onChangeText={(value) => updateFormData('amount', value)}
                  keyboardType="decimal-pad"
                  error={!!errors.amount}
                  style={styles.amountInput}
                />
                <View style={styles.currencyContainer}>
                  {CURRENCIES.map((currency) => (
                    <Chip
                      key={currency}
                      selected={formData.currency === currency}
                      onPress={() => updateFormData('currency', currency)}
                      style={styles.currencyChip}
                    >
                      {currency}
                    </Chip>
                  ))}
                </View>
              </View>
              {errors.amount && <HelperText type="error">{errors.amount}</HelperText>}
            </View>

            <View style={styles.section}>
              <TextInput
                label="Recipient Address"
                value={formData.recipient}
                onChangeText={(value) => updateFormData('recipient', value)}
                error={!!errors.recipient}
                multiline
              />
              {errors.recipient && <HelperText type="error">{errors.recipient}</HelperText>}
            </View>

            {formData.type === 'cross_chain' && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Chain Selection
                </Text>
                <View style={styles.chainRow}>
                  <View style={styles.chainContainer}>
                    <Text variant="bodyMedium">From</Text>
                    {CHAINS.map((chain) => (
                      <Chip
                        key={`source-${chain.value}`}
                        selected={formData.sourceChain === chain.value}
                        onPress={() => updateFormData('sourceChain', chain.value)}
                        style={styles.chainChip}
                      >
                        {chain.label}
                      </Chip>
                    ))}
                  </View>
                  <View style={styles.chainContainer}>
                    <Text variant="bodyMedium">To</Text>
                    {CHAINS.map((chain) => (
                      <Chip
                        key={`target-${chain.value}`}
                        selected={formData.targetChain === chain.value}
                        onPress={() => updateFormData('targetChain', chain.value)}
                        style={styles.chainChip}
                      >
                        {chain.label}
                      </Chip>
                    ))}
                  </View>
                </View>
                {errors.targetChain && <HelperText type="error">{errors.targetChain}</HelperText>}
              </View>
            )}

            <View style={styles.section}>
              <TextInput
                label="Memo (Optional)"
                value={formData.memo}
                onChangeText={(value) => updateFormData('memo', value)}
                multiline
                numberOfLines={2}
              />
            </View>

            {feeEstimate && (
              <Card style={styles.feeCard}>
                <Card.Content>
                  <Text variant="titleMedium">Fee Estimate</Text>
                  <View style={styles.feeRow}>
                    <Text>Gas Fee:</Text>
                    <Text>{feeEstimate.gasFee} ETH</Text>
                  </View>
                  {feeEstimate.bridgeFee && (
                    <View style={styles.feeRow}>
                      <Text>Bridge Fee:</Text>
                      <Text>{feeEstimate.bridgeFee} {formData.currency}</Text>
                    </View>
                  )}
                  {feeEstimate.estimatedYield && (
                    <View style={styles.feeRow}>
                      <Text>Estimated Yield:</Text>
                      <Text style={styles.yieldText}>+{feeEstimate.estimatedYield} {formData.currency}</Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}

            {estimatingFees && (
              <View style={styles.estimatingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.estimatingText}>Estimating fees...</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={isLoading || estimatingFees}
          loading={isLoading}
          style={styles.submitButton}
        >
          Create Payment
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  amountInput: {
    flex: 1,
  },
  currencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  currencyChip: {
    marginBottom: 4,
  },
  chainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  chainContainer: {
    flex: 1,
  },
  chainChip: {
    marginBottom: 8,
  },
  feeCard: {
    backgroundColor: '#e8f5e8',
    marginBottom: 16,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  yieldText: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  estimatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  estimatingText: {
    marginLeft: 8,
  },
  submitButton: {
    marginBottom: 24,
  },
});