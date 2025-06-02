import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HederaConversationalAgent } from '../../src/agent/conversational-agent';
import { AbstractSigner } from '../../src/signer/abstract-signer';
import { PrivateKey, AccountId } from '@hashgraph/sdk';
import { Logger } from '@hashgraphonline/standards-sdk';
import { StructuredTool } from '@langchain/core/tools';

/**
 * Mock signer for testing
 */
class MockSigner extends AbstractSigner {
  private accountId: AccountId;
  private privateKey: PrivateKey;

  constructor(accountId: string, privateKey: PrivateKey) {
    super();
    this.accountId = AccountId.fromString(accountId);
    this.privateKey = privateKey;
  }

  getAccountId(): AccountId {
    return this.accountId;
  }

  getNetwork(): 'mainnet' | 'testnet' {
    return 'testnet';
  }

  async getPublicKey(): Promise<any> {
    return this.privateKey.publicKey;
  }

  getOperatorPrivateKey(): PrivateKey {
    return this.privateKey;
  }

  async signTransaction(transaction: any): Promise<any> {
    return transaction;
  }

  async signAndExecuteTransaction(transaction: any): Promise<any> {
    return {
      status: { toString: () => 'SUCCESS' },
      transactionId: '0.0.12345@1234567890.123456789',
    };
  }

  async checkTransactionStatus(transactionId: any): Promise<boolean> {
    return true;
  }

  getPrivateKey(): PrivateKey {
    return this.privateKey;
  }
}

describe('HederaConversationalAgent Tool Filter', () => {
  let agent: HederaConversationalAgent;
  let mockSigner: MockSigner;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: any;
  let filteredTools: string[] = [];

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = 'test-key';

    const testKey = PrivateKey.generateED25519();
    mockSigner = new MockSigner('0.0.12345', testKey);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    filteredTools = [];
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should filter out specified tools', async () => {
    const toolsToFilter = [
      'hedera-account-transfer-hbar',
      'hedera-account-create',
      'hedera-hts-create-fungible-token',
      'hedera-hts-create-nft',
    ];

    const loggedTools: { filtered: string[]; kept: string[]; all: string[] } = {
      filtered: [],
      kept: [],
      all: [],
    };

    agent = new HederaConversationalAgent(mockSigner, {
      openAIApiKey: 'test-key',
      toolFilter: (tool: StructuredTool) => {
        loggedTools.all.push(tool.name);
        const shouldKeep = !toolsToFilter.includes(tool.name);
        if (!shouldKeep) {
          loggedTools.filtered.push(tool.name);
        } else {
          loggedTools.kept.push(tool.name);
        }
        return shouldKeep;
      },
      verbose: false,
    });

    await agent.initialize();

    // Check that tools were filtered
    expect(loggedTools.filtered.length).toBeGreaterThan(0);
    expect(loggedTools.filtered).toContain('hedera-account-transfer-hbar');
    expect(loggedTools.filtered).toContain('hedera-account-create');
    expect(loggedTools.filtered).toContain('hedera-hts-create-fungible-token');
    expect(loggedTools.filtered).toContain('hedera-hts-create-nft');

    // Verify some tools were kept
    expect(loggedTools.kept.length).toBeGreaterThan(0);

    // Verify the filter was called
    expect(loggedTools.all.length).toBeGreaterThan(0);
  });

  it('should keep all tools when no filter is provided', async () => {
    agent = new HederaConversationalAgent(mockSigner, {
      openAIApiKey: 'test-key',
    });

    await agent.initialize();

    // No tools should be filtered
    expect(filteredTools).toHaveLength(0);
  });

  it('should handle filter that removes all tools', async () => {
    const logger = new Logger({ module: 'test', level: 'silent' });
    const warnSpy = vi.spyOn(logger, 'warn');

    agent = new HederaConversationalAgent(mockSigner, {
      openAIApiKey: 'test-key',
      toolFilter: () => false, // Filter out all tools
      verbose: false,
      disableLogging: false,
    });

    // Spy on the agent's logger
    const agentLogger = (agent as any).logger;
    const agentWarnSpy = vi.spyOn(agentLogger, 'warn');

    await agent.initialize();

    // Should warn about no tools
    expect(agentWarnSpy).toHaveBeenCalledWith(
      'No tools were loaded into HederaAgentKit. The agent may not function correctly.'
    );
  });

  it('should only keep tools matching a specific pattern', async () => {
    const keptTools: string[] = [];

    agent = new HederaConversationalAgent(mockSigner, {
      openAIApiKey: 'test-key',
      toolFilter: (tool: StructuredTool) => {
        const shouldKeep =
          tool.name.includes('get-') || tool.name.includes('query');
        if (shouldKeep) {
          keptTools.push(tool.name);
        }
        return shouldKeep;
      },
    });

    await agent.initialize();

    // All kept tools should match the pattern
    keptTools.forEach((toolName) => {
      expect(toolName.includes('get-') || toolName.includes('query')).toBe(
        true
      );
    });
  });
});
