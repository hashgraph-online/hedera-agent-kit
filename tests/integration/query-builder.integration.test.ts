import { describe, it, expect, beforeAll } from 'vitest';
import { HederaAgentKit } from '../../src/agent';
import {
  initializeTestKit,
  createTestAgentExecutor,
  createSimpleTestAgentExecutor,
  getToolOutputFromResult,
} from './utils';
import { AccountId } from '@hashgraph/sdk';
import { HederaGetAccountInfoTool } from '../../src/langchain/tools/account/get-account-info-tool';
import { HederaGetAccountBalanceTool } from '../../src/langchain/tools/account/get-account-balance-tool';
import { HederaGetAccountPublicKeyTool } from '../../src/langchain/tools/account/get-account-public-key-tool';
import { HederaGetAccountTokensTool } from '../../src/langchain/tools/account/get-account-tokens-tool';
import { HederaGetAccountNftsTool } from '../../src/langchain/tools/account/get-account-nfts-tool';
import { HederaGetTopicInfoTool } from '../../src/langchain/tools/hcs/get-topic-info-tool';
import { HederaGetTopicFeesTool } from '../../src/langchain/tools/hcs/get-topic-fees-tool';
import { HederaGetTokenInfoTool } from '../../src/langchain/tools/hts/get-token-info-tool';
import { HederaGetHbarPriceTool } from '../../src/langchain/tools/network/get-hbar-price-tool';
import { HederaGetTransactionTool } from '../../src/langchain/tools/transaction/get-transaction-tool';
import { BaseHederaQueryToolParams } from '../../src/langchain/tools/common/base-hedera-query-tool';

describe('Hedera Query Tools Integration Tests', () => {
  let kit: HederaAgentKit;
  let operatorAccountId: AccountId;
  let openAIApiKey: string;
  let queryToolParams: BaseHederaQueryToolParams;
  let realAccountId: string;
  let realTopicId: string;
  let realTokenId: string;

  beforeAll(async () => {
    kit = await initializeTestKit();
    operatorAccountId = kit.signer.getAccountId();
    openAIApiKey = process.env.OPENAI_API_KEY as string;

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }

    queryToolParams = {
      hederaKit: kit,
      logger: kit.logger,
    };

    const network = kit.network === 'mainnet' ? 'mainnet-public' : 'testnet';
    const baseUrl = `https://${network}.mirrornode.hedera.com`;

    try {
      const accountsResponse = await fetch(
        `${baseUrl}/api/v1/accounts?limit=1&order=desc`
      );
      const accountsData = await accountsResponse.json();
      realAccountId = accountsData.accounts?.[0]?.account || '0.0.2';

      realTopicId = '0.0.5734750';

      const tokensResponse = await fetch(
        `${baseUrl}/api/v1/tokens?limit=1&order=desc`
      );
      const tokensData = await tokensResponse.json();
      realTokenId = tokensData.tokens?.[0]?.token_id || '0.0.2';

      console.log(
        `Using real entities - Account: ${realAccountId}, Topic: ${realTopicId}, Token: ${realTokenId}`
      );
    } catch {
      console.warn('Failed to fetch real entity IDs, using fallbacks');
      realAccountId = '0.0.2';
      realTopicId = '0.0.2';
      realTokenId = '0.0.2';
    }
  });

  describe('Account Query Tools', () => {
    it('should get account info using HederaGetAccountInfoTool', async () => {
      const tool = new HederaGetAccountInfoTool(queryToolParams);
      const agentExecutor = await createSimpleTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get account info for ${operatorAccountId.toString()}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.accountInfo).toBeDefined();
      expect(result.accountInfo.account).toBe(operatorAccountId.toString());
      expect(result.accountInfo.balance).toBeDefined();
    });

    it('should get account balance using HederaGetAccountBalanceTool', async () => {
      const tool = new HederaGetAccountBalanceTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get the HBAR balance for account ${operatorAccountId.toString()}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.accountId).toBe(operatorAccountId.toString());
      expect(typeof result.balance).toBe('number');
      expect(result.balance).toBeGreaterThan(0);
      expect(result.unit).toBe('HBAR');
    });

    it('should get account public key using HederaGetAccountPublicKeyTool', async () => {
      const tool = new HederaGetAccountPublicKeyTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get the public key for account ${operatorAccountId.toString()}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.publicKey).toBeDefined();
    });

    it('should get account tokens using HederaGetAccountTokensTool', async () => {
      const tool = new HederaGetAccountTokensTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get the tokens associated with account ${operatorAccountId.toString()}, limit to 10 results`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(Array.isArray(result.tokens)).toBe(true);
    });

    it('should get account NFTs using HederaGetAccountNftsTool', async () => {
      const tool = new HederaGetAccountNftsTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get the NFTs owned by account ${operatorAccountId.toString()}, limit to 10 results`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.nfts).toBeDefined();
      expect(Array.isArray(result.nfts)).toBe(true);
    });
  });

  describe('HCS Query Tools', () => {
    it('should get topic info using HederaGetTopicInfoTool', async () => {
      const tool = new HederaGetTopicInfoTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get information for topic ${realTopicId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.topicInfo).toBeDefined();
      expect(result.topicInfo.topic_id).toBe(realTopicId);
    });

    it('should get topic fees using HederaGetTopicFeesTool', async () => {
      const tool = new HederaGetTopicFeesTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get the fees for topic ${realTopicId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.topicId).toBe(realTopicId);
      expect(result.customFees !== undefined).toBe(true);
    });
  });

  describe('HTS Query Tools', () => {
    it('should get token info using HederaGetTokenInfoTool', async () => {
      const tool = new HederaGetTokenInfoTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get information for token ${realTokenId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.tokenInfo).toBeDefined();
      expect(result.tokenInfo.token_id).toBe(realTokenId);
    });
  });

  describe('Network Query Tools', () => {
    it('should get HBAR price using HederaGetHbarPriceTool', async () => {
      const tool = new HederaGetHbarPriceTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const timestamp = yesterday.toISOString();

      const prompt = `Get the HBAR price for timestamp ${timestamp}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.priceUsd).toBeDefined();
      expect(typeof result.priceUsd).toBe('number');
      expect(result.priceUsd).toBeGreaterThan(0);
      expect(result.currency).toBe('USD');
    });
  });

  describe('Transaction Query Tools', () => {
    it('should handle non-existent transaction using HederaGetTransactionTool', async () => {
      const tool = new HederaGetTransactionTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const fakeTransactionId = '0.0.123@1234567890.123456789';
      const prompt = `Get transaction details for transaction ID ${fakeTransactionId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.transaction).toBeNull();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid account ID gracefully', async () => {
      const tool = new HederaGetAccountInfoTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const invalidAccountId = '0.0.999999999';
      const prompt = `Get account information for account ${invalidAccountId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.accountInfo).toBeNull();
      } else {
        expect(result.error).toBeDefined();
        expect(result.error).toContain('404');
      }
    });

    it('should handle invalid topic ID gracefully', async () => {
      const tool = new HederaGetTopicInfoTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const invalidTopicId = '0.0.999999999';
      const prompt = `Get information for topic ${invalidTopicId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.topicInfo).toBeNull();
      } else {
        expect(result.error).toBeDefined();
        expect(result.error).toContain('404');
      }
    });

    it('should handle invalid token ID gracefully', async () => {
      const tool = new HederaGetTokenInfoTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const invalidTokenId = '0.0.999999999';
      const prompt = `Get information for token ${invalidTokenId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.tokenInfo).toBeNull();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Real Entity Tests', () => {
    it('should get real account info', async () => {
      const tool = new HederaGetAccountInfoTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get account information for account ${realAccountId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.accountInfo).toBeDefined();
      expect(result.accountInfo.account).toBe(realAccountId);
    });

    it('should get real topic info', async () => {
      const tool = new HederaGetTopicInfoTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get information for topic ${realTopicId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.topicInfo).toBeDefined();
      expect(result.topicInfo.topic_id).toBe(realTopicId);
    });

    it('should get real token info', async () => {
      const tool = new HederaGetTokenInfoTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get information for token ${realTokenId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.tokenInfo).toBeDefined();
      expect(result.tokenInfo.token_id).toBe(realTokenId);
    });
  });
});
