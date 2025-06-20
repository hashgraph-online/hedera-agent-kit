import { updateEnvFile } from './state-tools';
import {
  RegisteredAgent,
  ActiveConnection,
  IStateManager,
  AgentPersistenceOptions,
  EnvFilePersistenceOptions,
  ConnectionStatus,
} from './state-types';
import {
  ConnectionsManager,
  HCS10BaseClient,
  Connection,
  Logger,
  IConnectionsManager,
} from '@hashgraphonline/standards-sdk';

/**
 * Implementation of the IStateManager interface for the OpenConvai system.
 * Manages agent state and connection information with thread safety and
 * proper timestamp tracking.
 */
export class OpenConvaiState implements IStateManager {
  private currentAgent: RegisteredAgent | null = null;
  private connectionMessageTimestamps: Record<string, number> = {};
  private defaultEnvFilePath?: string;
  private defaultPrefix: string;
  private connectionsManager: IConnectionsManager | null = null;
  private logger: Logger;

  /**
   * Creates a new OpenConvaiState instance
   * @param options - Options for environment variable persistence
   */
  constructor(options?: {
    defaultEnvFilePath?: string;
    defaultPrefix?: string;
    baseClient?: HCS10BaseClient;
    disableLogging?: boolean;
  }) {
    if (options?.defaultEnvFilePath) {
      this.defaultEnvFilePath = options.defaultEnvFilePath;
    }
    this.defaultPrefix = options?.defaultPrefix ?? 'TODD';
    const shouldSilence =
      options?.disableLogging || process.env.DISABLE_LOGGING === 'true';
    this.logger = new Logger({
      module: 'OpenConvaiState',
      silent: shouldSilence,
    });

    if (options?.baseClient) {
      this.initializeConnectionsManager(options.baseClient);
    }
  }

  /**
   * Initializes the ConnectionsManager
   * @param baseClient - HCS10BaseClient instance to use
   */
  initializeConnectionsManager(
    baseClient: HCS10BaseClient
  ): IConnectionsManager {
    if (!this.connectionsManager) {
      this.logger.debug('Initializing ConnectionsManager');
      this.connectionsManager = new ConnectionsManager({
        baseClient,
        logLevel: 'error',
      });
    } else {
      this.logger.debug('ConnectionsManager already initialized');
    }
    return this.connectionsManager;
  }

  /**
   * Gets the ConnectionsManager instance
   * @returns The ConnectionsManager instance, or null if not initialized
   */
  getConnectionsManager(): IConnectionsManager | null {
    return this.connectionsManager;
  }

  /**
   * Sets the current active agent and clears any previous connection data.
   * This should be called when switching between agents.
   */
  setCurrentAgent(agent: RegisteredAgent | null): void {
    this.currentAgent = agent;
    this.connectionMessageTimestamps = {};

    if (this.connectionsManager) {
      this.connectionsManager.clearAll();
    }
  }

  /**
   * Returns the currently active agent or null if none is set.
   */
  getCurrentAgent(): RegisteredAgent | null {
    return this.currentAgent;
  }

  /**
   * Adds a new connection to the active connections list.
   * Ensures no duplicates are added based on connectionTopicId.
   * Initializes timestamp tracking for the connection.
   */
  addActiveConnection(connection: ActiveConnection): void {
    if (!this.connectionsManager) {
      this.logger.error(
        'ConnectionsManager not initialized. Call initializeConnectionsManager before adding connections.'
      );
      throw new Error(
        'ConnectionsManager not initialized. Call initializeConnectionsManager before adding connections.'
      );
    }

    let connectionTopicId = connection.connectionTopicId;
    if (connectionTopicId && typeof connectionTopicId === 'object' && 'toString' in connectionTopicId) {
      connectionTopicId = (connectionTopicId as { toString(): string }).toString();
    }

    let targetInboundTopicId = connection.targetInboundTopicId;
    if (targetInboundTopicId && typeof targetInboundTopicId === 'object' && 'toString' in targetInboundTopicId) {
      targetInboundTopicId = (targetInboundTopicId as { toString(): string }).toString();
    }

    const sdkConnection: Connection = {
      connectionTopicId: connectionTopicId,
      targetAccountId: connection.targetAccountId,
      targetAgentName: connection.targetAgentName,
      targetInboundTopicId: targetInboundTopicId,
      status: this.convertConnectionStatus(connection.status || 'established'),
      isPending: connection.isPending || false,
      needsConfirmation: connection.needsConfirmation || false,
      created: connection.created || new Date(),
      lastActivity: connection.lastActivity || new Date(),
      ...(connection.profileInfo
        ? { profileInfo: connection.profileInfo }
        : {}),
      ...(connection.connectionRequestId
        ? { connectionRequestId: connection.connectionRequestId }
        : {}),
      processed: true,
    };

    this.connectionsManager.updateOrAddConnection(sdkConnection);

    this.initializeTimestampIfNeeded(connectionTopicId);
  }

  /**
   * Updates an existing connection or adds it if not found.
   * Preserves existing properties when updating by merging objects.
   */
  updateOrAddConnection(connection: ActiveConnection): void {
    this.addActiveConnection(connection);
  }

  /**
   * Returns a copy of all active connections.
   */
  listConnections(): ActiveConnection[] {
    if (!this.connectionsManager) {
      this.logger.debug(
        'ConnectionsManager not initialized, returning empty connections list'
      );
      return [];
    }

    return this.connectionsManager
      .getAllConnections()
      .filter((conn) => {
        const topicId = conn.connectionTopicId;
        if (!topicId) return false;
        
        const topicIdStr = typeof topicId === 'object' && 'toString' in topicId 
          ? (topicId as { toString(): string }).toString() 
          : topicId;
          
        return typeof topicIdStr === 'string' && /^\d+\.\d+\.\d+$/.test(topicIdStr);
      })
      .map((conn) => this.convertToActiveConnection(conn));
  }

  /**
   * Finds a connection by its identifier, which can be:
   * - A 1-based index as displayed in the connection list
   * - A target account ID string
   * - A connection topic ID string
   */
  getConnectionByIdentifier(identifier: string): ActiveConnection | undefined {
    if (!this.connectionsManager) {
      return undefined;
    }

    const connections = this.listConnections();

    const numericIndex = parseInt(identifier) - 1;
    if (
      !isNaN(numericIndex) &&
      numericIndex >= 0 &&
      numericIndex < connections.length
    ) {
      return connections[numericIndex];
    }

    const byTopicId =
      this.connectionsManager.getConnectionByTopicId(identifier);
    if (byTopicId && this.isValidConnection(byTopicId)) {
      return this.convertToActiveConnection(byTopicId);
    }

    const byAccountId =
      this.connectionsManager.getConnectionByAccountId(identifier);
    if (byAccountId && this.isValidConnection(byAccountId)) {
      return this.convertToActiveConnection(byAccountId);
    }

    return undefined;
  }

  /**
   * Gets the last processed message timestamp for a connection.
   * Returns 0 if no timestamp has been recorded.
   */
  getLastTimestamp(connectionTopicId: string): number {
    return this.connectionMessageTimestamps[connectionTopicId] || 0;
  }

  /**
   * Updates the last processed message timestamp for a connection,
   * but only if the new timestamp is more recent than the existing one.
   */
  updateTimestamp(connectionTopicId: string, timestampNanos: number): void {
    if (!(connectionTopicId in this.connectionMessageTimestamps)) {
      this.connectionMessageTimestamps[connectionTopicId] = timestampNanos;
      return;
    }

    const currentTimestamp =
      this.connectionMessageTimestamps[connectionTopicId];
    if (timestampNanos > currentTimestamp) {
      this.connectionMessageTimestamps[connectionTopicId] = timestampNanos;
    }
  }

  /**
   * Helper method to initialize timestamp tracking for a connection
   * if it doesn't already exist.
   */
  private initializeTimestampIfNeeded(connectionTopicId: string): void {
    if (!(connectionTopicId in this.connectionMessageTimestamps)) {
      this.connectionMessageTimestamps[connectionTopicId] =
        Date.now() * 1_000_000;
    }
  }

  /**
   * Checks if a connection has a valid connection topic ID
   */
  private isValidConnection(conn: Connection): boolean {
    const topicId = conn.connectionTopicId;
    if (!topicId) return false;
    
    const topicIdStr = typeof topicId === 'object' && 'toString' in topicId 
      ? (topicId as { toString(): string }).toString() 
      : topicId;
      
    return typeof topicIdStr === 'string' && /^\d+\.\d+\.\d+$/.test(topicIdStr);
  }

  /**
   * Converts ConnectionStatus to SDK status format
   */
  private convertConnectionStatus(
    status: string
  ): 'pending' | 'established' | 'needs_confirmation' | 'closed' {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'established':
        return 'established';
      case 'needs confirmation':
        return 'needs_confirmation';
      default:
        return 'established';
    }
  }

  /**
   * Converts SDK Connection to ActiveConnection
   */
  private convertToActiveConnection(conn: Connection): ActiveConnection {
    let connectionTopicId = conn.connectionTopicId;
    if (connectionTopicId && typeof connectionTopicId === 'object' && 'toString' in connectionTopicId) {
      connectionTopicId = (connectionTopicId as { toString(): string }).toString();
    }
    
    let targetInboundTopicId = conn.targetInboundTopicId || '';
    if (targetInboundTopicId && typeof targetInboundTopicId === 'object' && 'toString' in targetInboundTopicId) {
      targetInboundTopicId = (targetInboundTopicId as { toString(): string }).toString();
    }
    
    return {
      targetAccountId: conn.targetAccountId,
      targetAgentName: conn.targetAgentName || `Agent ${conn.targetAccountId}`,
      targetInboundTopicId: targetInboundTopicId,
      connectionTopicId: connectionTopicId,
      status: this.convertToStateStatus(conn.status),
      created: conn.created,
      lastActivity: conn.lastActivity || new Date(),
      isPending: conn.isPending,
      needsConfirmation: conn.needsConfirmation,
      ...(conn.profileInfo ? { profileInfo: conn.profileInfo } : {}),
      ...(conn.connectionRequestId
        ? { connectionRequestId: conn.connectionRequestId }
        : {}),
    };
  }

  /**
   * Converts SDK status to state status format
   */
  private convertToStateStatus(status: string): ConnectionStatus {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'established':
        return 'established';
      case 'needs_confirmation':
        return 'needs confirmation';
      case 'closed':
        return 'established';
      default:
        return 'unknown';
    }
  }

  /**
   * Persists agent data to environment variables
   * @param agent - The agent data to persist
   * @param options - Environment file persistence options
   */
  async persistAgentData(
    agent: RegisteredAgent,
    options?: AgentPersistenceOptions
  ): Promise<void> {
    if (options?.type && options.type !== 'env-file') {
      throw new Error(
        `Unsupported persistence type: ${options.type}. Only 'env-file' is supported.`
      );
    }

    const envFilePath =
      (options as EnvFilePersistenceOptions)?.envFilePath ||
      this.defaultEnvFilePath ||
      process.env.ENV_FILE_PATH ||
      '.env';

    if (!envFilePath) {
      throw new Error(
        'Environment file path could not be determined for agent data persistence'
      );
    }

    const prefix =
      (options as EnvFilePersistenceOptions)?.prefix || this.defaultPrefix;

    if (!agent.accountId || !agent.inboundTopicId || !agent.outboundTopicId) {
      throw new Error('Agent data incomplete, cannot persist to environment');
    }

    const updates: Record<string, string> = {
      [`${prefix}_ACCOUNT_ID`]: agent.accountId,
      [`${prefix}_INBOUND_TOPIC_ID`]: agent.inboundTopicId,
      [`${prefix}_OUTBOUND_TOPIC_ID`]: agent.outboundTopicId,
    };

    if (agent.privateKey) {
      updates[`${prefix}_PRIVATE_KEY`] = agent.privateKey;
    }

    if (agent.profileTopicId) {
      updates[`${prefix}_PROFILE_TOPIC_ID`] = agent.profileTopicId;
    }

    await updateEnvFile(envFilePath, updates);
  }
}
