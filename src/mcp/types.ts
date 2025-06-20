/**
 * Types for MCP (Model Context Protocol) client integration
 */

export interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface CreditBalance {
  current: number;
  totalPurchased: number;
  totalConsumed: number;
  lastUpdated?: string;
}

export interface CreditBalanceResponse {
  accountId: string;
  balance: CreditBalance;
  operationCosts: Array<{ operationName: string; baseCost: number }>;
  conversionRate: number;
  message: string;
  error?: string;
  operation?: 'check_credit_balance';
  status?: 'unauthorized' | 'forbidden';
}

export interface PaymentTransaction {
  transaction_bytes: string;
  transaction_id: string;
  amount_hbar: number;
  expected_credits: number;
  server_account_id: string;
}

export interface PaymentVerification {
  success: boolean;
  status?: string;
  credits_allocated?: number;
  timestamp?: string;
  message: string;
}

export interface PaymentStatus {
  transaction_id: string;
  status: 'pending' | 'completed' | 'failed';
  credits_allocated?: number;
  timestamp?: string;
}

export interface PaymentHistoryItem {
  transaction_id: string;
  amount_hbar: number;
  credits_allocated: number;
  status: string;
  timestamp: string;
}

export interface PaymentHistory {
  account_id: string;
  total_payments: number;
  payments: PaymentHistoryItem[];
}

export interface CreditTransaction {
  accountId: string;
  transactionType: 'purchase' | 'consumption';
  amount: number;
  balanceAfter: number;
  description?: string;
  relatedOperation?: string;
  createdAt: string;
}

export interface CreditHistory {
  accountId: string;
  transactions: CreditTransaction[];
  count: number;
  message: string;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  error?: string;
  operation?: 'get_credit_history';
  status?: 'unauthorized' | 'forbidden';
}


export interface PricingConfiguration {
  operations: Record<string, number>;
  currentHbarToUsdRate: number;
  tiers: Array<{
    tier: string;
    minCredits: number;
    maxCredits: number | null;
    creditsPerUSD: number;
    discount: number;
  }>;
  modifiers: {
    bulkDiscount: { threshold: number; discount: number };
    peakHours: { multiplier: number; hours: number[] };
    loyaltyTiers: Array<{ threshold: number; discount: number }>;
  };
  error?: string;
}

export interface AuthChallenge {
  challengeId: string | null;
  challenge: string | null;
  expiresAt: string | null;
  network?: string;
  error?: string;
}

export interface AuthSignatureParams extends Record<string, unknown> {
  challengeId: string;
  hederaAccountId: string;
  signature: string;
  publicKey: string;
  timestamp: number;
  name?: string;
  permissions?: string[];
  expiresIn?: number;
}

export interface AuthResponse {
  apiKey: string | null;
  keyId: string | null;
  expiresAt?: string | null;
  permissions?: string[];
  error?: string;
}

export interface ApiKeyList {
  keys: Array<{
    id: string;
    name: string;
    permissions: string[];
    createdAt: string;
    expiresAt: string | null;
    lastUsedAt: string | null;
    isActive: boolean;
  }>;
  error?: string;
}

export interface RotateKeyResponse {
  apiKey: string | null;
  keyId: string | null;
  expiresAt?: string | null;
  message?: string;
  error?: string;
}

export interface RevokeKeyResponse {
  success: boolean;
  message?: string;
  keyId?: string;
  error?: string;
}

export interface MCPClientConfig {
  serverUrl?: string;
  apiKey?: string;
  clientName?: string;
  clientVersion?: string;
}

export interface HealthCheckResult {
  status: 'healthy';
  timestamp: string;
  network: string;
  version: string;
  hederaNetwork: string;
  hcs10Enabled: boolean;
  serverAccount: string;
  registrationStatus: {
    isRegistered: boolean;
    hasProfile: boolean;
    lastChecked: string;
  } | null;
}

export interface ServerInfo {
  name: string;
  version: string;
  description: string;
  network: string;
  server_account_id: string;
  serverAccount: string;
  hederaNetwork: string;
  credits_conversion_rate: number;
  creditsConversionRate: number;
  supported_operations: string[];
  capabilities: {
    traditionalMCP: boolean;
    hcs10Support: boolean;
    mcpServerProfile: boolean;
  };
  identity: {
    accountId: string;
    inboundTopicId: string;
    outboundTopicId: string;
    profileTopicId: string | null;
  } | null;
}

export interface GenerateTransactionParams extends Record<string, unknown> {
  operation: string;
  parameters: Record<string, unknown>;
  signerAccountId?: string;
}

export interface GenerateTransactionResult {
  operation: 'generate_transaction_bytes';
  mode: 'provideBytes';
  result: unknown;
  transactionBytes?: string;
  message: string;
  status: 'completed' | 'failed' | 'unauthorized' | 'forbidden' | 'insufficient_credits';
  error?: string;
  required?: number;
  current?: number;
  shortfall?: number;
  request?: string;
}

export interface ScheduleTransactionParams extends Record<string, unknown> {
  operation: string;
  parameters: Record<string, unknown>;
  scheduleMemo?: string;
  expirationTime?: number;
  waitForExpiry?: boolean;
  payerAccountId?: string;
}

export interface ScheduleTransactionResult {
  operation: 'schedule_transaction';
  mode: 'scheduleTransaction';
  result: unknown;
  scheduleId?: string;
  transactionBytes?: string;
  message: string;
  status: 'completed' | 'failed' | 'unauthorized' | 'forbidden' | 'insufficient_credits';
  error?: string;
  required?: number;
  current?: number;
  shortfall?: number;
  request?: string;
}

export interface ExecuteTransactionParams extends Record<string, unknown> {
  operation: string;
  parameters: Record<string, unknown>;
}

export interface ExecuteTransactionResult {
  operation: 'execute_transaction';
  mode: 'directExecution';
  result: unknown;
  message: string;
  status: 'completed' | 'failed' | 'unauthorized' | 'forbidden' | 'insufficient_credits';
  error?: string;
  required?: number;
  current?: number;
  shortfall?: number;
  request?: string;
}

export interface ProcessPaymentParams extends Record<string, unknown> {
  transactionId: string;
  payerAccountId: string;
  amountHbar: number;
}

export interface ProcessPaymentResult {
  success: boolean;
  transactionId?: string;
  hbarAmount?: number;
  creditsAllocated?: number;
  message?: string;
  error?: string;
}

export interface ProfileRefreshResult {
  success?: boolean;
  profileState?: {
    isRegistered: boolean;
    accountId: string;
    inboundTopicId: string;
    outboundTopicId: string;
    profileTopicId: string | null;
    lastChecked: string;
    needsUpdate: boolean;
  };
  profile?: unknown;
  topicInfo?: unknown;
  error?: string;
}

export interface ExecuteQueryParams extends Record<string, unknown> {
  query: string;
  parameters: Record<string, unknown>;
}

export interface ExecuteQueryResult {
  operation: 'execute_query';
  result: unknown;
  message: string;
  status: 'completed' | 'failed' | 'unauthorized';
  error?: string;
}