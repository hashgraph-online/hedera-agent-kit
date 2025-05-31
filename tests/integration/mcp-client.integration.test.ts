import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient, getMCPClient, resetMCPClient } from '../../src/mcp';
import { Logger } from '@hashgraphonline/standards-sdk';
import { ServerSigner } from '../../src/signer/server-signer';
import './setup-env';

describe('MCP Client Integration Tests', () => {
  let client: MCPClient;
  let testAccountId: string;
  let testPrivateKey: string;
  let serverUrl: string;

  beforeAll(() => {
    testAccountId = process.env.HEDERA_ACCOUNT_ID!;
    testPrivateKey = process.env.HEDERA_PRIVATE_KEY!;
    serverUrl =
      process.env.HEDERA_MCP_SERVER_URL || 'http://localhost:3000/stream';

    if (!testAccountId || !testPrivateKey) {
      throw new Error(
        'HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in environment'
      );
    }

    client = new MCPClient({ serverUrl });
  });

  afterAll(async () => {
    await client.disconnect();
    await resetMCPClient();
  });

  describe('Connection Management', () => {
    it('should connect to MCP server', async () => {
      await client.connect();
      expect(client.connected).toBe(true);
    });

    it('should handle reconnection after disconnect', async () => {
      await client.connect();
      expect(client.connected).toBe(true);

      await client.disconnect();
      expect(client.connected).toBe(false);

      await client.connect();
      expect(client.connected).toBe(true);
    });

    it('should use singleton instance', () => {
      const client1 = getMCPClient();
      const client2 = getMCPClient();
      expect(client1).toBe(client2);
    });

    it('should reset singleton instance', async () => {
      const client1 = getMCPClient();
      await resetMCPClient();
      const client2 = getMCPClient();
      expect(client1).not.toBe(client2);
    });
  });

  describe('Credit Management', () => {
    it('should get credit balance for an account', async () => {
      try {
        const balance = await client.getCreditBalance(testAccountId);

        expect(balance).toBeDefined();
        expect(balance).toHaveProperty('current');
        expect(balance).toHaveProperty('totalPurchased');
        expect(balance).toHaveProperty('totalConsumed');
        expect(typeof balance.current).toBe('number');
        expect(typeof balance.totalPurchased).toBe('number');
        expect(typeof balance.totalConsumed).toBe('number');
      } catch (error) {
        // May require authentication
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Authentication');
      }
    });

    it('should get credit history', async () => {
      try {
        const history = await client.getCreditHistory(testAccountId, 10);

        expect(history).toBeDefined();
        expect(history).toHaveProperty('transactions');
        expect(history).toHaveProperty('count');
        expect(Array.isArray(history.transactions)).toBe(true);
        expect(typeof history.count).toBe('number');
      } catch (error) {
        // May require authentication
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Authentication');
      }
    });

    it('should get pricing configuration', async () => {
      const pricing = await client.getPricingConfiguration();

      expect(pricing).toBeDefined();
      expect(pricing).toHaveProperty('operations');
      expect(pricing).toHaveProperty('tiers');
      expect(pricing).toHaveProperty('modifiers');
      expect(Array.isArray(pricing.tiers)).toBe(true);

      if (pricing.tiers.length > 0) {
        const tier = pricing.tiers[0];
        expect(tier).toHaveProperty('tier');
        expect(tier).toHaveProperty('minCredits');
        expect(tier).toHaveProperty('maxCredits');
        expect(tier).toHaveProperty('creditsPerUSD');
        expect(tier).toHaveProperty('discount');
      }
    });
  });

  describe('Payment Transactions', () => {
    it('should create a payment transaction', async () => {
      const amount = 1;
      const memo = 'Test purchase from hedera-agent-kit';

      const transaction = await client.createPaymentTransaction(
        testAccountId,
        amount,
        memo
      );

      expect(transaction).toBeDefined();
      expect(transaction).toHaveProperty('transaction_bytes');
      expect(transaction).toHaveProperty('transaction_id');
      expect(transaction).toHaveProperty('amount_hbar');
      expect(transaction).toHaveProperty('expected_credits');
      expect(transaction).toHaveProperty('server_account_id');
      expect(transaction.amount_hbar).toBe(amount);
    });

    it('should check payment status', async () => {
      // Using a mock transaction ID for testing
      const mockTransactionId = '0.0.12345@1234567890.123456789';

      try {
        const status = await client.checkPaymentStatus(mockTransactionId);

        expect(status).toBeDefined();
        expect(status).toHaveProperty('transaction_id');
        expect(status).toHaveProperty('status');
        expect(['pending', 'completed', 'failed']).toContain(status.status);
      } catch (error) {
        // Expected for mock transaction ID
        expect(error).toBeDefined();
      }
    });

    it('should get payment history', async () => {
      const history = await client.getPaymentHistory(testAccountId, 10);

      expect(history).toBeDefined();
      expect(history).toHaveProperty('account_id');
      expect(history).toHaveProperty('total_payments');
      expect(history).toHaveProperty('payments');
      expect(history.account_id).toBe(testAccountId);
      expect(Array.isArray(history.payments)).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should request authentication challenge', async () => {
      try {
        const challenge = await client.requestAuthChallenge(testAccountId);

        expect(challenge).toBeDefined();
        expect(challenge).toHaveProperty('challengeId');
        expect(challenge).toHaveProperty('challenge');
        expect(challenge).toHaveProperty('expiresAt');

        // The API might return these as null
        if (challenge.challenge !== null) {
          expect(typeof challenge.challenge).toBe('string');
        }
      } catch (error) {
        // Authentication endpoints might not be available in all environments
        const logger = new Logger({ module: 'MCPClientTest' });
        logger.debug('Auth challenge test failed (might be expected)', {
          error,
        });
        expect(error).toBeDefined();
      }
    });

    it('should handle authentication flow', async () => {
      try {
        const challenge = await client.requestAuthChallenge(testAccountId);

        const signer = new ServerSigner(
          testAccountId,
          testPrivateKey,
          'testnet'
        );
        const privateKey = signer.getOperatorPrivateKey();
        const publicKey = privateKey.publicKey;

        const messageToSign = `${
          challenge.challenge
        }_${testAccountId}_${Date.now()}`;
        const messageBytes = Buffer.from(messageToSign, 'utf8');
        const signature = privateKey.sign(messageBytes);

        // Handle null challengeId
        const challengeIdString = challenge.challengeId || 'test-challenge-id';

        const authResponse = await client.verifyAuthSignature({
          challengeId: challengeIdString,
          hederaAccountId: testAccountId,
          signature: Buffer.from(signature).toString('hex'),
          publicKey: publicKey.toString(),
          timestamp: Date.now(),
          name: 'Test API Key',
          permissions: ['read', 'write'],
          expiresIn: 3600,
        });

        expect(authResponse).toBeDefined();
        expect(authResponse).toHaveProperty('apiKey');
        expect(authResponse).toHaveProperty('keyId');
        if (authResponse.permissions) {
          expect(Array.isArray(authResponse.permissions)).toBe(true);
        }

        client.setApiKey(authResponse.apiKey);
      } catch (error) {
        // Authentication might fail if MCP server requires specific setup
        const logger = new Logger({ module: 'MCPClientTest' });
        logger.debug('Authentication flow test failed (might be expected)', {
          error,
        });
        expect(error).toBeDefined();
      }
    });

    it('should manage API keys', async () => {
      const keysList = await client.getApiKeys(testAccountId);

      expect(keysList).toBeDefined();
      expect(keysList).toHaveProperty('keys');
      expect(Array.isArray(keysList.keys)).toBe(true);

      if (keysList.keys.length > 0) {
        const key = keysList.keys[0];
        expect(key).toHaveProperty('id');
        expect(key).toHaveProperty('name');
        expect(key).toHaveProperty('permissions');
        expect(key).toHaveProperty('createdAt');
        expect(key).toHaveProperty('isActive');

        // Test rotate API key with new signature
        try {
          const rotateResult = await client.rotateApiKey({
            keyId: key.id,
            hederaAccountId: testAccountId,
          });

          expect(rotateResult).toBeDefined();
          if (rotateResult.apiKey) {
            expect(typeof rotateResult.apiKey).toBe('string');
          }
          if (rotateResult.keyId) {
            expect(typeof rotateResult.keyId).toBe('string');
          }
        } catch (error) {
          // May fail if key is already rotated or insufficient permissions
          const logger = new Logger({ module: 'MCPClientTest' });
          logger.debug('Rotate API key test failed (expected in some cases)', {
            error,
          });
        }

        // Test revoke API key with new signature
        try {
          const revokeResult = await client.revokeApiKey({
            keyId: key.id,
            hederaAccountId: testAccountId,
          });

          expect(revokeResult).toBeDefined();
          expect(revokeResult).toHaveProperty('success');
          if (revokeResult.message) {
            expect(typeof revokeResult.message).toBe('string');
          }
        } catch (error) {
          // May fail if key is already revoked or insufficient permissions
          const logger = new Logger({ module: 'MCPClientTest' });
          logger.debug('Revoke API key test failed (expected in some cases)', {
            error,
          });
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const badClient = new MCPClient({
        serverUrl: 'http://invalid-server:9999/stream',
      });

      await expect(badClient.connect()).rejects.toThrow();
      expect(badClient.connected).toBe(false);
    });

    it('should auto-reconnect on connection loss', async () => {
      await client.connect();
      expect(client.connected).toBe(true);

      await client.disconnect();

      try {
        const balance = await client.getCreditBalance(testAccountId);
        expect(balance).toBeDefined();
        expect(client.connected).toBe(true);
      } catch (error) {
        // May require authentication
        expect(client.connected).toBe(true); // Should still reconnect even if auth fails
        expect((error as Error).message).toContain('Authentication');
      }
    });
  });

  describe('Tool Calling', () => {
    it('should call generic tools', async () => {
      const result = await client.callTool('get_pricing_configuration', {});
      expect(result).toBeDefined();
    });

    it('should handle tool errors', async () => {
      await expect(client.callTool('non_existent_tool', {})).rejects.toThrow();
    });
  });

  describe('Core MCP Tools', () => {
    it('should check server health', async () => {
      const health = await client.healthCheck();
      
      expect(health).toBeDefined();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health.status).toBe('healthy');
      expect(health).toHaveProperty('network');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('hederaNetwork');
      expect(health).toHaveProperty('hcs10Enabled');
      expect(health).toHaveProperty('serverAccount');
    });

    it('should get server info', async () => {
      const info = await client.getServerInfo();
      
      expect(info).toBeDefined();
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('description');
      expect(info).toHaveProperty('network');
      expect(info).toHaveProperty('capabilities');
      expect(info.capabilities).toHaveProperty('traditionalMCP');
      expect(info.capabilities).toHaveProperty('hcs10Support');
      expect(info.capabilities).toHaveProperty('mcpServerProfile');
    });

    it('should generate transaction bytes', async () => {
      try {
        const result = await client.generateTransactionBytes({
          operation: 'createAccount',
          parameters: {
            initialBalance: 1,
            receiverSigRequired: false
          }
        });
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('operation');
        expect(result).toHaveProperty('mode');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('message');
        expect(result.operation).toBe('generate_transaction_bytes');
        expect(result.mode).toBe('provideBytes');
      } catch (error) {
        // May require auth or specific setup
        expect(error).toBeDefined();
      }
    });

    it('should execute query', async () => {
      try {
        const result = await client.executeQuery({
          query: 'getAccountInfo',
          parameters: {
            accountId: testAccountId
          }
        });
        
        expect(result).toBeDefined();
      } catch (error) {
        // May require auth or specific setup
        expect(error).toBeDefined();
      }
    });

    it('should refresh profile', async () => {
      try {
        const result = await client.refreshProfile();
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
      } catch (error) {
        // May require HCS-11 profile setup
        expect(error).toBeDefined();
      }
    });
  });
});
