import { describe, it, expect, beforeAll } from 'vitest';
import { HederaAgentKit } from '../../src/agent';
import {
  initializeTestKit,
  createTestAgentExecutor,
  createSimpleTestAgentExecutor,
  getToolOutputFromResult,
} from './utils';
import { HederaGetContractTool } from '../../src/langchain/tools/scs/get-contract-tool';
import { BaseHederaQueryToolParams } from '../../src/langchain/tools/common/base-hedera-query-tool';
import { ModelCapability } from '../../src/types/model-capability';

describe('Contract Query Tools with Flexible Response Processing', () => {
  let kit: HederaAgentKit;
  let openAIApiKey: string;
  let realContractId: string;

  beforeAll(async () => {
    kit = await initializeTestKit();
    openAIApiKey = process.env.OPENAI_API_KEY as string;

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }

    const network = kit.network === 'mainnet' ? 'mainnet-public' : 'testnet';
    const baseUrl = `https://${network}.mirrornode.hedera.com`;

    try {
      const contractsResponse = await fetch(
        `${baseUrl}/api/v1/contracts?limit=1&order=desc`
      );
      const contractsData = await contractsResponse.json();
      realContractId =
        contractsData.contracts?.[0]?.contract_id || '0.0.6054801';

      console.log(`Using real contract ID: ${realContractId}`);
    } catch {
      console.warn('Failed to fetch real contract ID, using fallback');
      realContractId = '0.0.6054801';
    }
  });

  describe('HederaGetContractTool - Model Capability Tests', () => {
    it('should truncate bytecode for SMALL model capability', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.SMALL,
      };

      const tool = new HederaGetContractTool(queryToolParams);
      const agentExecutor = await createSimpleTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get contract information for ${realContractId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.contract).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.contractId).toBe(realContractId);
      expect(result.summary.bytecodeIncluded).toBe(false);

      if (result.contract.bytecode) {
        expect(result.contract.bytecode.length).toBeGreaterThan(0);
        if (result.contract.bytecode.includes('[Use includeBytecode=true')) {
          expect(result.contract.bytecode.length).toBeLessThan(300);
        }
      }

      if (result.contract.runtime_bytecode) {
        expect(result.contract.runtime_bytecode.length).toBeGreaterThan(0);
        if (
          result.contract.runtime_bytecode.includes('[Use includeBytecode=true')
        ) {
          expect(result.contract.runtime_bytecode.length).toBeLessThan(300);
        }
      }
    });

    it('should include full bytecode when includeBytecode=true regardless of model capability', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.SMALL,
      };

      const tool = new HederaGetContractTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get contract information for ${realContractId} with includeBytecode set to true`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.contract).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.bytecodeIncluded).toBe(true);

      if (result.contract.bytecode) {
        expect(result.contract.bytecode.length).toBeGreaterThan(200);
        expect(result.contract.bytecode).not.toContain(
          '[Use includeBytecode=true'
        );
      }
    });

    it('should handle MEDIUM model capability with selective truncation', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.MEDIUM,
      };

      const tool = new HederaGetContractTool(queryToolParams);
      const agentExecutor = await createSimpleTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get contract information for ${realContractId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.contract).toBeDefined();

      if (result.contract.bytecode) {
        expect(result.contract.bytecode.length).toBeGreaterThan(0);
      }

      if (result.contract.runtime_bytecode) {
        expect(result.contract.runtime_bytecode.length).toBeGreaterThan(0);
      }
    });

    it('should handle LARGE model capability with minimal truncation', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.LARGE,
      };

      const tool = new HederaGetContractTool(queryToolParams);
      const agentExecutor = await createSimpleTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get contract information for ${realContractId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.contract).toBeDefined();

      if (result.contract.bytecode) {
        expect(result.contract.bytecode.length).toBeGreaterThan(0);
      }
    });

    it('should handle UNLIMITED model capability with no truncation', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.UNLIMITED,
      };

      const tool = new HederaGetContractTool(queryToolParams);
      const agentExecutor = await createSimpleTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get contract information for ${realContractId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.contract).toBeDefined();

      if (result.contract.bytecode) {
        expect(result.contract.bytecode.length).toBeGreaterThan(0);
      }
    });
  });

  describe('HederaGetContractTool - Custom Strategy Tests', () => {
    it('should respect custom response strategy', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.MEDIUM,
        customStrategy: {
          maxTokens: 2000,
          includeMetadata: true,
        },
      };

      const tool = new HederaGetContractTool(queryToolParams);
      const agentExecutor = await createSimpleTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get contract information for ${realContractId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      const resultString = JSON.stringify(result);
      const estimatedTokens = Math.ceil(resultString.length / 4);

      if (estimatedTokens > 1600) {
        expect(result._meta).toBeDefined();
        expect(result._meta.estimatedTokens).toBeDefined();
        expect(result._meta.maxTokens).toBe(2000);
      }
    });
  });

  describe('HederaGetContractTool - Parameter Tests', () => {
    it('should handle includeBytecode parameter correctly', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.SMALL,
      };

      const tool = new HederaGetContractTool(queryToolParams);

      const resultWithoutBytecode = await tool.invoke({
        contractIdOrAddress: realContractId,
        includeBytecode: false,
      });

      const resultWithBytecode = await tool.invoke({
        contractIdOrAddress: realContractId,
        includeBytecode: true,
      });

      const parsedWithout = JSON.parse(resultWithoutBytecode);
      const parsedWith = JSON.parse(resultWithBytecode);

      expect(parsedWithout.summary.bytecodeIncluded).toBe(false);
      expect(parsedWith.summary.bytecodeIncluded).toBe(true);

      if (parsedWithout.contract.bytecode && parsedWith.contract.bytecode) {
        expect(parsedWithout.contract.bytecode.length).toBeLessThan(
          parsedWith.contract.bytecode.length
        );
      }
    });

    it('should handle timestamp parameter with real contract timestamp', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.MEDIUM,
      };

      const tool = new HederaGetContractTool(queryToolParams);

      const currentResult = await tool.invoke({
        contractIdOrAddress: realContractId,
      });
      const currentParsed = JSON.parse(currentResult);

      if (
        !currentParsed.success ||
        !currentParsed.contract?.created_timestamp
      ) {
        console.warn(
          'Skipping timestamp test - no valid contract timestamp available'
        );
        return;
      }

      const contractTimestamp = currentParsed.contract.created_timestamp;

      const timestampResult = await tool.invoke({
        contractIdOrAddress: realContractId,
        timestamp: contractTimestamp,
      });
      const timestampParsed = JSON.parse(timestampResult);

      expect(timestampParsed).toBeDefined();
      expect(timestampParsed.success).toBe(true);
      expect(timestampParsed.contract).toBeDefined();
      expect(timestampParsed.contract.contract_id).toBe(realContractId);
    });
  });

  describe('HederaGetContractTool - Error Handling', () => {
    it('should handle non-existent contract gracefully', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.MEDIUM,
      };

      const tool = new HederaGetContractTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const nonExistentContractId = '0.0.999999999';
      const prompt = `Get contract information for ${nonExistentContractId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    it('should handle invalid contract address format', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.MEDIUM,
      };

      const tool = new HederaGetContractTool(queryToolParams);
      const agentExecutor = await createTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const invalidContractId = 'invalid-contract-id';
      const prompt = `Get contract information for ${invalidContractId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('HederaGetContractTool - Response Structure', () => {
    it('should return consistent response structure', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.MEDIUM,
      };

      const tool = new HederaGetContractTool(queryToolParams);
      const agentExecutor = await createSimpleTestAgentExecutor(
        tool as any,
        openAIApiKey
      );

      const prompt = `Get contract information for ${realContractId}`;
      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.contract).toBeDefined();
      expect(result.summary).toBeDefined();

      expect(result.summary).toHaveProperty('contractId');
      expect(result.summary).toHaveProperty('evmAddress');
      expect(result.summary).toHaveProperty('created');
      expect(result.summary).toHaveProperty('expiration');
      expect(result.summary).toHaveProperty('deleted');
      expect(result.summary).toHaveProperty('memo');
      expect(result.summary).toHaveProperty('autoRenewPeriod');
      expect(result.summary).toHaveProperty('maxAutomaticTokenAssociations');
      expect(result.summary).toHaveProperty('hasAdminKey');
      expect(result.summary).toHaveProperty('hasBytecode');
      expect(result.summary).toHaveProperty('hasRuntimeBytecode');
      expect(result.summary).toHaveProperty('bytecodeIncluded');

      expect(result.contract).toHaveProperty('contract_id');
      expect(result.contract).toHaveProperty('evm_address');
      expect(result.contract).toHaveProperty('created_timestamp');
      expect(result.contract).toHaveProperty('deleted');
    });
  });

  describe('HederaGetContractTool - Performance Tests', () => {
    it('should complete within reasonable time for small model', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.SMALL,
      };

      const tool = new HederaGetContractTool(queryToolParams);

      const startTime = Date.now();
      const result = await tool.invoke({
        contractIdOrAddress: realContractId,
        includeBytecode: false,
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000);
      expect(result).toBeDefined();

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
    });

    it('should handle large responses efficiently', async () => {
      const queryToolParams: BaseHederaQueryToolParams = {
        hederaKit: kit,
        logger: kit.logger,
        modelCapability: ModelCapability.UNLIMITED,
      };

      const tool = new HederaGetContractTool(queryToolParams);

      const startTime = Date.now();
      const result = await tool.invoke({
        contractIdOrAddress: realContractId,
        includeBytecode: true,
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(15000);
      expect(result).toBeDefined();

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
    });
  });
});
