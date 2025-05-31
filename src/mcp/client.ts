import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Logger } from '@hashgraphonline/standards-sdk';
import {
  MCPToolResult,
  CreditBalance,
  CreditBalanceResponse,
  PaymentTransaction,
  PaymentVerification,
  PaymentStatus,
  PaymentHistory,
  CreditHistory,
  PricingConfiguration,
  AuthChallenge,
  AuthSignatureParams,
  AuthResponse,
  ApiKeyList,
  RotateKeyResponse,
  RevokeKeyResponse,
  MCPClientConfig,
  HealthCheckResult,
  ServerInfo,
  GenerateTransactionParams,
  GenerateTransactionResult,
  ScheduleTransactionParams,
  ScheduleTransactionResult,
  ExecuteTransactionParams,
  ExecuteTransactionResult,
  ProcessPaymentParams,
  ProcessPaymentResult,
  ProfileRefreshResult,
  ExecuteQueryParams,
  ExecuteQueryResult,
} from './types';

/**
 * MCP Client for communicating with the Hedera MCP Server
 * Provides access to credit management, authentication, and tool execution
 */
export class MCPClient {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private logger: Logger;
  private apiKey: string | null = null;
  private serverUrl: string;
  private clientName: string;
  private clientVersion: string;

  private static instance: MCPClient | null = null;

  public static getInstance(config: MCPClientConfig = {}): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient(config);
    }
    return MCPClient.instance;
  }

  public static setInstance(instance: MCPClient | null): void {
    MCPClient.instance = instance;
  }

  constructor(config: MCPClientConfig = {}) {
    this.serverUrl =
      config.serverUrl ||
      process.env.HEDERA_MCP_SERVER_URL ||
      'http://localhost:3000/stream';
    this.apiKey = config.apiKey || null;
    this.clientName = config.clientName || 'hedera-agent-kit';
    this.clientVersion = config.clientVersion || '1.0.0';

    this.logger = new Logger({
      module: 'MCPClient',
      level: process.env.DEBUG === 'true' ? 'debug' : 'info',
    });

    this.logger.info('MCPClient initialized', {
      serverUrl: this.serverUrl,
      hasApiKey: !!this.apiKey,
      clientName: this.clientName,
      envUrl: process.env.HEDERA_MCP_SERVER_URL,
      isSSR: typeof window === 'undefined',
    });
  }

  /**
   * Set the API key for authentication
   * @param apiKey The API key to use for authentication
   */
  setApiKey(apiKey: string | null): void {
    if (this.apiKey === apiKey) {
      return;
    }
    this.apiKey = apiKey;
    if (this.isConnected) {
      this.logger.debug(
        'API key changed, disconnecting to force reconnection',
        {
          hadApiKey: !!this.apiKey,
          hasNewApiKey: !!apiKey,
        }
      );
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Get the current API key
   * @returns The current API key or null
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Connects to the MCP server using streaming HTTP transport
   * @returns Promise that resolves when connected
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      this.logger.debug('Already connected, checking if API key matches', {
        hasClient: true,
        hasApiKey: !!this.apiKey,
      });
      return;
    }

    try {
      this.logger.debug('Creating transport', {
        url: this.serverUrl,
        hasApiKey: !!this.apiKey,
        apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 8) + '...' : null,
      });

      const requestInit: RequestInit = {};
      if (this.apiKey) {
        requestInit.headers = {
          Authorization: `Bearer ${this.apiKey}`,
        };
      }

      const transport = new StreamableHTTPClientTransport(
        new URL(this.serverUrl),
        { requestInit }
      );

      this.client = new Client(
        {
          name: this.clientName,
          version: this.clientVersion,
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(transport as any);

      this.isConnected = true;
      this.logger.info('Connected to MCP server with streaming transport', {
        hasApiKey: !!this.apiKey,
      });
    } catch (error) {
      this.logger.error('Failed to connect to MCP server', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        serverUrl: this.serverUrl,
        transportType: 'StreamableHTTPClientTransport',
        hasApiKey: !!this.apiKey,
      });
      this.isConnected = false;
      this.client = null;
      throw error;
    }
  }

  /**
   * Calls a tool on the MCP server
   * @param toolName The name of the tool to call
   * @param args Arguments to pass to the tool
   * @returns The tool result
   */
  async callTool<T = unknown>(
    toolName: string,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    this.logger.debug('Calling MCP tool', { toolName, args });

    if (!this.isConnected || !this.client) {
      this.logger.debug('Client not connected, connecting now');
      await this.connect();
    }

    try {
      this.logger.debug('Attempting tool call', {
        toolName,
        isConnected: this.isConnected,
        hasClient: !!this.client,
        hasApiKey: !!this.apiKey,
        clientState: this.client ? 'exists' : 'null',
      });

      if (!this.client) {
        throw new Error('Client is null after connection attempt');
      }

      const result = (await this.client.callTool({
        name: toolName,
        arguments: args,
      })) as MCPToolResult;

      this.logger.debug('Tool result received', { toolName, result });

      if (result.content && result.content.length > 0) {
        const textContent = result.content.find((c) => c.type === 'text');
        if (textContent) {
          try {
            const parsed = JSON.parse(textContent.text) as T;
            this.logger.debug('Tool result parsed', { toolName, parsed });
            return parsed;
          } catch {
            this.logger.debug('Tool returning raw text', {
              toolName,
              text: textContent.text,
            });
            return textContent.text as T;
          }
        }
      }

      this.logger.debug('Tool returning full result', { toolName, result });
      return result as T;
    } catch (error) {
      this.logger.error('Failed to call tool', { toolName, error });

      if (error instanceof Error && error.message.includes('Not connected')) {
        this.logger.warn('Connection lost, attempting to reconnect and retry');
        this.isConnected = false;
        this.client = null;

        try {
          await this.connect();
          const result = (await this.client!.callTool({
            name: toolName,
            arguments: args,
          })) as MCPToolResult;

          this.logger.debug('Tool result received after reconnect', {
            toolName,
            result,
          });

          if (result.content && result.content.length > 0) {
            const textContent = result.content.find((c) => c.type === 'text');
            if (textContent) {
              try {
                const parsed = JSON.parse(textContent.text) as T;
                return parsed;
              } catch {
                return textContent.text as T;
              }
            }
          }

          return result as T;
        } catch (retryError) {
          this.logger.error('Failed to call tool after reconnect', {
            toolName,
            error: retryError,
          });
          throw retryError;
        }
      }

      throw error;
    }
  }

  /**
   * Gets credit balance for an account
   * @param accountId The Hedera account ID
   * @returns The credit balance information
   */
  async getCreditBalance(accountId: string): Promise<CreditBalance> {
    const result = await this.callTool<CreditBalanceResponse>(
      'check_credit_balance',
      { accountId }
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result.balance;
  }

  /**
   * Creates a payment transaction for purchasing credits
   * @param payerAccountId The payer's Hedera account ID
   * @param amount The amount of HBAR to pay
   * @param memo Optional transaction memo
   * @returns Transaction details including bytes and ID
   */
  async createPaymentTransaction(
    payerAccountId: string,
    amount: number,
    memo?: string
  ): Promise<PaymentTransaction> {
    const result = await this.callTool<PaymentTransaction>('purchase_credits', {
      payer_account_id: payerAccountId,
      amount,
      memo,
    });

    this.logger.info('Payment transaction result', {
      result,
      hasTransactionBytes: !!result.transaction_bytes,
      transactionBytesLength: result.transaction_bytes?.length,
    });

    return result;
  }

  /**
   * Verifies a payment transaction and allocates credits
   * @param transactionId The transaction ID to verify
   * @returns Verification result
   */
  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    return await this.callTool<PaymentVerification>('verify_payment', {
      transaction_id: transactionId,
    });
  }

  /**
   * Checks payment status
   * @param transactionId The transaction ID to check
   * @returns Payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    return await this.callTool<PaymentStatus>('check_payment_status', {
      transaction_id: transactionId,
    });
  }

  /**
   * Gets payment history for an account
   * @param accountId The Hedera account ID
   * @param limit Maximum number of records to return
   * @returns Payment history with transactions
   */
  async getPaymentHistory(
    accountId: string,
    limit: number = 50
  ): Promise<PaymentHistory> {
    return await this.callTool<PaymentHistory>('get_payment_history', {
      account_id: accountId,
      limit,
    });
  }

  /**
   * Gets pricing configuration
   * @returns Pricing tiers and configuration
   */
  async getPricingConfiguration(): Promise<PricingConfiguration> {
    const result = await this.callTool<PricingConfiguration>(
      'get_pricing_configuration',
      {}
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Request authentication challenge from MCP server
   * @param hederaAccountId The Hedera account ID requesting authentication
   * @returns Authentication challenge details
   */
  async requestAuthChallenge(hederaAccountId: string): Promise<AuthChallenge> {
    const result = await this.callTool<AuthChallenge>(
      'request_auth_challenge',
      {
        hederaAccountId,
      }
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Verify signature and authenticate with MCP server
   * @param params Authentication parameters including signature and challenge
   * @returns API key and authentication details
   */
  async verifyAuthSignature(
    params: AuthSignatureParams
  ): Promise<AuthResponse> {
    const result = await this.callTool<AuthResponse>(
      'verify_auth_signature',
      params
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Get API keys for the authenticated account
   * @param hederaAccountId The Hedera account ID (optional, uses authenticated account if not provided)
   * @returns List of API keys for the account
   */
  async getApiKeys(hederaAccountId?: string): Promise<ApiKeyList> {
    const params = hederaAccountId ? { hederaAccountId } : {};
    const result = await this.callTool<ApiKeyList>('get_api_keys', params);
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Rotate an API key
   * @param params Rotation parameters
   * @returns New API key details
   */
  async rotateApiKey(params: {
    keyId: string;
    hederaAccountId: string;
  }): Promise<RotateKeyResponse> {
    const result = await this.callTool<RotateKeyResponse>(
      'rotate_api_key',
      params
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Revoke an API key
   * @param params Revocation parameters
   * @returns Revocation status
   */
  async revokeApiKey(params: {
    keyId: string;
    hederaAccountId: string;
  }): Promise<RevokeKeyResponse> {
    const result = await this.callTool<RevokeKeyResponse>(
      'revoke_api_key',
      params
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Gets credit transaction history
   * @param accountId The Hedera account ID
   * @param limit Maximum number of records to return
   * @returns Credit transaction history
   */
  async getCreditHistory(
    accountId: string,
    limit: number = 20
  ): Promise<CreditHistory> {
    const result = await this.callTool<CreditHistory>('get_credit_history', {
      accountId,
      limit,
    });
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Check server health and status
   * @returns Server health information
   */
  async healthCheck(): Promise<HealthCheckResult> {
    return await this.callTool<HealthCheckResult>('health_check', {});
  }

  /**
   * Get server configuration and capabilities
   * @returns Server information including version and capabilities
   */
  async getServerInfo(): Promise<ServerInfo> {
    return await this.callTool<ServerInfo>('get_server_info', {});
  }

  /**
   * Generate transaction bytes for any Hedera operation without execution
   * @param params Transaction parameters
   * @returns Transaction bytes and metadata
   */
  async generateTransactionBytes(
    params: GenerateTransactionParams
  ): Promise<GenerateTransactionResult> {
    const result = await this.callTool<GenerateTransactionResult>(
      'generate_transaction_bytes',
      params
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Create scheduled transaction for any Hedera operation
   * @param params Schedule transaction parameters
   * @returns Scheduled transaction details
   */
  async scheduleTransaction(
    params: ScheduleTransactionParams
  ): Promise<ScheduleTransactionResult> {
    const result = await this.callTool<ScheduleTransactionResult>(
      'schedule_transaction',
      params
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Execute any Hedera transaction immediately
   * @param params Transaction execution parameters
   * @returns Transaction result
   */
  async executeTransaction(
    params: ExecuteTransactionParams
  ): Promise<ExecuteTransactionResult> {
    const result = await this.callTool<ExecuteTransactionResult>(
      'execute_transaction',
      params
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Manually process an HBAR payment for credit allocation
   * @param params Payment processing parameters
   * @returns Payment processing result
   */
  async processHbarPayment(
    params: ProcessPaymentParams
  ): Promise<ProcessPaymentResult> {
    const result = await this.callTool<ProcessPaymentResult>(
      'process_hbar_payment',
      params
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Refresh server HCS-11 profile and registration status
   * @returns Profile refresh result
   */
  async refreshProfile(): Promise<ProfileRefreshResult> {
    const result = await this.callTool<ProfileRefreshResult>(
      'refresh_profile',
      {}
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Execute read-only queries on Hedera network
   * @param params Query parameters
   * @returns Query result
   */
  async executeQuery(params: ExecuteQueryParams): Promise<ExecuteQueryResult> {
    const result = await this.callTool<ExecuteQueryResult>(
      'execute_query',
      params
    );
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }

  /**
   * Gets the current connection status
   * @returns True if connected, false otherwise
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnects from the MCP server
   * @returns Promise that resolves when disconnected
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.close();
      } catch (error) {
        this.logger.error('Error closing MCP client', { error });
      }
      this.client = null;
      this.isConnected = false;
      this.logger.info('Disconnected from MCP server');
    }
  }
}

/**
 * Gets the singleton MCP client instance for communicating with the Hedera MCP Server
 * @param config Optional configuration to override defaults
 * @returns The singleton MCPClient instance
 */
export function getMCPClient(config?: MCPClientConfig): MCPClient {
  if (!MCPClient.getInstance()) {
    MCPClient.getInstance(config);
  }
  return MCPClient.getInstance();
}

/**
 * Resets the MCP client instance by disconnecting the current client and clearing the singleton
 * @returns A promise that resolves when the client has been disconnected and reset
 */
export async function resetMCPClient(): Promise<void> {
  if (MCPClient.getInstance()) {
    await MCPClient.getInstance().disconnect();
    MCPClient.setInstance(null);
  }
}
