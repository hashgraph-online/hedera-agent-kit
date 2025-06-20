import { vi } from 'vitest';

vi.mock('../../src/state/state-tools', () => ({
  __esModule: true,
  updateEnvFile: vi.fn(() => Promise.resolve()),
}));

import { OpenConvaiState } from '../../src/state/open-convai-state';
import {
  HCS10BaseClient,
  IConnectionsManager,
  Connection,
  AIAgentProfile,
} from '@hashgraphonline/standards-sdk';
import {
  ActiveConnection,
  RegisteredAgent,
  AgentPersistenceOptions,
} from '../../src/state/state-types';
import { describe, beforeEach, it, expect } from 'vitest';

const ESTABLISHED_STATUS = 'established';
const TEST_ACCOUNT_ID = '0.0.777';
const TEST_PRIVATE_KEY = TEST_PRIVATE_KEY;

describe('OpenConvaiState', () => {
  let state: OpenConvaiState;
  let mockBaseClient: HCS10BaseClient;
  let connectionsManagerInstance: IConnectionsManager | null;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBaseClient = {
      getMessages: vi.fn<() => Promise<Connection[]>>().mockResolvedValue([]),
      submitMessage: vi.fn<() => Promise<{ success: boolean }>>().mockResolvedValue({ success: true }),
      requestAccount: vi
        .fn<() => Promise<{ balance: { balance: number } }>>()
        .mockResolvedValue({ balance: { balance: 0 } }),
      getClient: vi.fn().mockReturnValue({ connected: true }),
      getAccountAndSigner: vi.fn().mockReturnValue({
        accountId: '0.0.999',
        privateKey: 'mockPrivateKey',
        publicKey: 'mockPublicKey',
      }),
    } as unknown as HCS10BaseClient;

    state = new OpenConvaiState();
  });

  describe('constructor and initialization', () => {
    it('should initialize with default envFilePath and prefix', () => {
      expect((state as unknown as { defaultEnvFilePath?: string }).defaultEnvFilePath).toBeUndefined();
      expect((state as unknown as { defaultPrefix: string }).defaultPrefix).toBe('TODD');
      expect((state as unknown as { logger: unknown }).logger).toBeDefined();
    });

    it('should initialize with provided options', () => {
      const opts = {
        defaultEnvFilePath: '.env.test',
        defaultPrefix: 'TEST',
        baseClient: mockBaseClient,
      };
      const initState = new OpenConvaiState(opts);
      expect((initState as unknown as { defaultEnvFilePath: string }).defaultEnvFilePath).toBe('.env.test');
      expect((initState as unknown as { defaultPrefix: string }).defaultPrefix).toBe('TEST');
      expect(initState.getConnectionsManager()).not.toBeNull();
    });

    it('should initialize ConnectionsManager when initializeConnectionsManager is called', () => {
      expect(state.getConnectionsManager()).toBeNull();
      const cm = state.initializeConnectionsManager(mockBaseClient);
      expect(cm).not.toBeNull();
      expect(state.getConnectionsManager()).toBe(cm);
      expect(cm).toBeDefined();
    });

    it('should return the same ConnectionsManager instance on subsequent calls to initializeConnectionsManager', () => {
      const cm1 = state.initializeConnectionsManager(mockBaseClient);
      const cm2 = state.initializeConnectionsManager(mockBaseClient);
      expect(cm1).toBe(cm2);
    });
  });

  const ensureConnectionsManager = (): IConnectionsManager => {
    if (!state.getConnectionsManager()) {
      connectionsManagerInstance =
        state.initializeConnectionsManager(mockBaseClient);
    } else {
      connectionsManagerInstance = state.getConnectionsManager();
    }
    if (!connectionsManagerInstance) {
      throw new Error('Failed to initialize ConnectionsManager for test');
    }
    return connectionsManagerInstance;
  };

  describe('setCurrentAgent', () => {
    it('should set the current agent and clear timestamps', () => {
      ensureConnectionsManager();
      const agent: RegisteredAgent = {
        name: 'TestAgent',
        accountId: '0.0.1',
        inboundTopicId: '0.0.2',
        outboundTopicId: '0.0.3',
      };
      state.setCurrentAgent(agent);
      expect(state.getCurrentAgent()).toEqual(agent);
      expect((state as unknown as { connectionMessageTimestamps: Record<string, unknown> }).connectionMessageTimestamps).toEqual({});
    });

    it('should call connectionsManager.clearAll if manager exists', () => {
      const cm = ensureConnectionsManager();
      vi.spyOn(cm, 'clearAll');
      const agent: RegisteredAgent = {
        name: 'TestAgent',
        accountId: '0.0.1',
        inboundTopicId: '0.0.2',
        outboundTopicId: '0.0.3',
      };
      state.setCurrentAgent(agent);
      expect(cm.clearAll).toHaveBeenCalled();
    });
  });

  describe('addActiveConnection', () => {
    it('should throw if ConnectionsManager is not initialized', () => {
      (state as unknown as { connectionsManager: null }).connectionsManager = null;
      const conn: ActiveConnection = {
        targetAccountId: '0.0.10',
        connectionTopicId: '0.0.11',
        targetAgentName: '',
        targetInboundTopicId: '',
      };
      expect(() => state.addActiveConnection(conn)).toThrow(
        'ConnectionsManager not initialized'
      );
    });

    it('should call connectionsManager.updateOrAddConnection and initialize timestamp', () => {
      const cm = ensureConnectionsManager();
      vi.spyOn(cm, 'updateOrAddConnection');
      const conn: ActiveConnection = {
        connectionTopicId: '0.0.123',
        targetAccountId: '0.0.456',
        targetAgentName: 'Target',
        targetInboundTopicId: '0.0.789',
        status: ESTABLISHED_STATUS,
      };
      state.addActiveConnection(conn);
      expect(cm.updateOrAddConnection).toHaveBeenCalled();
      const calledWith = vi.mocked(cm.updateOrAddConnection).mock
        .calls[0][0] as Connection;
      expect(calledWith.connectionTopicId).toBe('0.0.123');
      expect(calledWith.targetAccountId).toBe('0.0.456');
      expect(state.getLastTimestamp('0.0.123')).not.toBe(0);
    });
  });

  describe('listConnections', () => {
    it('should return empty array if ConnectionsManager is not initialized', () => {
      (state as unknown as { connectionsManager: null }).connectionsManager = null;
      expect(state.listConnections()).toEqual([]);
    });

    it('should call connectionsManager.getAllConnections and convert results', () => {
      const cm = ensureConnectionsManager();
      const sdkConn: Connection = {
        connectionTopicId: '0.0.1',
        targetAccountId: '0.0.2',
        status: ESTABLISHED_STATUS,
        created: new Date(),
        isPending: false,
        needsConfirmation: false,
        processed: true,
      };
      vi.spyOn(cm, 'getAllConnections').mockReturnValue([sdkConn]);
      const activeConns = state.listConnections();
      expect(cm.getAllConnections).toHaveBeenCalled();
      expect(activeConns.length).toBe(1);
      expect(activeConns[0].connectionTopicId).toBe('0.0.1');
      expect(activeConns[0].targetAccountId).toBe('0.0.2');
      expect(activeConns[0].status).toBe(ESTABLISHED_STATUS);
    });
  });

  describe('getConnectionByIdentifier', () => {
    let cm: IConnectionsManager;
    const sdkConn1: Connection = {
      connectionTopicId: 'topic1',
      targetAccountId: 'acc1',
      status: ESTABLISHED_STATUS,
      created: new Date(),
      isPending: false,
      needsConfirmation: false,
      processed: true,
      targetAgentName: 'Agent1',
      targetInboundTopicId: 'inTopic1',
    };
    const sdkConn2: Connection = {
      connectionTopicId: 'topic2',
      targetAccountId: 'acc2',
      status: 'pending',
      created: new Date(),
      isPending: true,
      needsConfirmation: false,
      processed: true,
      targetAgentName: 'Agent2',
      targetInboundTopicId: 'inTopic2',
    };

    beforeEach(() => {
      cm = ensureConnectionsManager();
      vi.spyOn(cm, 'getAllConnections').mockReturnValue([sdkConn1, sdkConn2]);
      vi.spyOn(cm, 'getConnectionByTopicId').mockImplementation((id) => {
        if (id === 'topic1') {
          return sdkConn1;
        }
        if (id === 'topic2') {
          return sdkConn2;
        }
        return undefined;
      });
      vi.spyOn(cm, 'getConnectionByAccountId').mockImplementation((id) => {
        if (id === 'acc1') {
          return sdkConn1;
        }
        if (id === 'acc2') {
          return sdkConn2;
        }
        return undefined;
      });
    });

    it('should find by 1-based index', () => {
      const conn = state.getConnectionByIdentifier('1');
      expect(conn?.connectionTopicId).toBe('topic1');
      const conn2 = state.getConnectionByIdentifier('2');
      expect(conn2?.connectionTopicId).toBe('topic2');
    });

    it('should find by topic ID', () => {
      const conn = state.getConnectionByIdentifier('topic1');
      expect(cm.getConnectionByTopicId).toHaveBeenCalledWith('topic1');
      expect(conn?.connectionTopicId).toBe('topic1');
    });

    it('should find by account ID if not found by topic ID', () => {
      vi.mocked(cm.getConnectionByTopicId).mockImplementation((id: string) => {
        if (id === 'acc2') {
          return undefined;
        }
        return undefined;
      });
      const conn = state.getConnectionByIdentifier('acc2');
      expect(cm.getConnectionByTopicId).toHaveBeenCalledWith('acc2');
      expect(cm.getConnectionByAccountId).toHaveBeenCalledWith('acc2');
      expect(conn?.targetAccountId).toBe('acc2');
    });

    it('should return undefined if not found', () => {
      vi.mocked(cm.getConnectionByTopicId).mockReturnValue(undefined);
      vi.mocked(cm.getConnectionByAccountId).mockReturnValue(undefined);
      const conn = state.getConnectionByIdentifier('nonexistent');
      expect(conn).toBeUndefined();
    });
  });

  describe('timestamp management', () => {
    const topicId = 'testTopicTime';
    beforeEach(() => {
      ensureConnectionsManager();
    });

    it('should return 0 for uninitialized timestamp', () => {
      expect(state.getLastTimestamp(topicId)).toBe(0);
    });

    it('should initialize timestamp on first addActiveConnection for a topic', () => {
      state.addActiveConnection({
        connectionTopicId: topicId,
        targetAccountId: 'any',
        status: ESTABLISHED_STATUS,
        targetAgentName: '',
        targetInboundTopicId: '',
      });
      expect(state.getLastTimestamp(topicId)).toBeGreaterThan(0);
    });

    it('should update timestamp if newer', () => {
      state.addActiveConnection({
        connectionTopicId: topicId,
        targetAccountId: 'any',
        status: ESTABLISHED_STATUS,
        targetAgentName: '',
        targetInboundTopicId: '',
      });
      const initialTime = state.getLastTimestamp(topicId);
      const laterTime = initialTime + 1000;
      state.updateTimestamp(topicId, laterTime);
      expect(state.getLastTimestamp(topicId)).toBe(laterTime);
    });

    it('should not update timestamp if older or same', () => {
      state.addActiveConnection({
        connectionTopicId: topicId,
        targetAccountId: 'any',
        status: ESTABLISHED_STATUS,
        targetAgentName: '',
        targetInboundTopicId: '',
      });
      const initialTime = Date.now() * 1_000_000;
      state.updateTimestamp(topicId, initialTime);

      state.updateTimestamp(topicId, initialTime - 1000);
      expect(state.getLastTimestamp(topicId)).toBe(initialTime);
      state.updateTimestamp(topicId, initialTime);
      expect(state.getLastTimestamp(topicId)).toBe(initialTime);
    });
  });

  describe('status conversion (internal helpers)', () => {
    it('convertToActiveConnection should map SDK Connection to ActiveConnection correctly', () => {
      const sdkConn: Connection = {
        connectionTopicId: 't1',
        targetAccountId: 'a1',
        targetAgentName: 'Agent X',
        targetInboundTopicId: 'in1',
        status: ESTABLISHED_STATUS,
        created: new Date(),
        lastActivity: new Date(),
        isPending: false,
        needsConfirmation: false,
        profileInfo: {} as AIAgentProfile,
        connectionRequestId: 123,
        processed: true,
      };
      const activeConn = (state as unknown as { convertToActiveConnection: (conn: Connection) => ActiveConnection }).convertToActiveConnection(sdkConn);
      expect(activeConn.connectionTopicId).toBe(sdkConn.connectionTopicId);
      expect(activeConn.targetAccountId).toBe(sdkConn.targetAccountId);
      expect(activeConn.targetAgentName).toBe('Agent X');
      expect(activeConn.targetInboundTopicId).toBe('in1');
      expect(activeConn.status).toBe(ESTABLISHED_STATUS);
      expect(activeConn.profileInfo).toEqual({});
      expect(activeConn.connectionRequestId).toBe(123);
    });

    it('should correctly map SDK statuses to state statuses via convertToStateStatus', () => {
      const convertToStateStatus = (state as unknown as { convertToStateStatus: (status: string) => string }).convertToStateStatus;
      expect(convertToStateStatus('pending')).toBe('pending');
      expect(convertToStateStatus(ESTABLISHED_STATUS)).toBe(ESTABLISHED_STATUS);
      expect(convertToStateStatus('needs_confirmation')).toBe('needs confirmation');
      expect(convertToStateStatus('closed')).toBe(ESTABLISHED_STATUS);
      expect(convertToStateStatus('unknown_status')).toBe('unknown');
    });
  });

  describe('persistAgentData', () => {
    const agent: RegisteredAgent = {
      name: 'PersistAgent',
      accountId: TEST_ACCOUNT_ID,
      privateKey: TEST_PRIVATE_KEY,
      inboundTopicId: '0.0.888',
      outboundTopicId: '0.0.999',
      profileTopicId: '0.0.111',
    };
    const options: AgentPersistenceOptions = {
      type: 'env-file',
      envFilePath: '.env.test.persist',
      prefix: 'TEST_AGENT',
    };

    it('should call updateEnvFile with correct parameters', async () => {
      const updateEnvFileSpy = vi.spyOn(state as unknown as { updateEnvFile: (path: string, vars: Record<string, string>) => Promise<void> }, 'updateEnvFile').mockResolvedValue(undefined);
      
      await state.persistAgentData(agent, options);

      expect(updateEnvFileSpy).toHaveBeenCalledWith(
        '.env.test.persist',
        {
          TEST_AGENT_ACCOUNT_ID: TEST_ACCOUNT_ID,
          TEST_AGENT_PRIVATE_KEY: TEST_PRIVATE_KEY,
          TEST_AGENT_INBOUND_TOPIC_ID: '0.0.888',
          TEST_AGENT_OUTBOUND_TOPIC_ID: '0.0.999',
          TEST_AGENT_PROFILE_TOPIC_ID: '0.0.111'
        }
      );
    });

    it('should throw error for unsupported persistence type', async () => {
      const invalidOptions: AgentPersistenceOptions = {
        type: 'unsupported' as 'env-file',
      };
      await expect(
        state.persistAgentData(agent, invalidOptions)
      ).rejects.toThrow(
        "Unsupported persistence type: unsupported. Only 'env-file' is supported."
      );
    });

    it('should throw error if agent data is incomplete', async () => {
      const incompleteAgent: RegisteredAgent = {
        ...agent,
        accountId: undefined as unknown as string,
      };
      await expect(
        state.persistAgentData(incompleteAgent, options)
      ).rejects.toThrow('Agent data incomplete, cannot persist to environment');
    });

    it('should use default prefix if not provided in options', async () => {
      const updateEnvFileSpy = vi.spyOn(state as unknown as { updateEnvFile: (path: string, vars: Record<string, string>) => Promise<void> }, 'updateEnvFile').mockResolvedValue(undefined);
      const optionsWithoutPrefix: AgentPersistenceOptions = {
        type: 'env-file',
        envFilePath: '.env.test.persist'
      };
      
      await state.persistAgentData(agent, optionsWithoutPrefix);

      expect(updateEnvFileSpy).toHaveBeenCalledWith(
        '.env.test.persist',
        {
          TODD_ACCOUNT_ID: TEST_ACCOUNT_ID,
          TODD_PRIVATE_KEY: TEST_PRIVATE_KEY,
          TODD_INBOUND_TOPIC_ID: '0.0.888',
          TODD_OUTBOUND_TOPIC_ID: '0.0.999',
          TODD_PROFILE_TOPIC_ID: '0.0.111'
        }
      );
    });
  });
});