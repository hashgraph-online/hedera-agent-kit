import { z } from 'zod';
import { CreateContractParams } from '../../../types';
import { Long } from '@hashgraph/sdk';
import { BigNumber } from 'bignumber.js';
import { Buffer } from 'buffer';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { ScsBuilder } from '../../../builders/scs/scs-builder';

const CreateContractZodSchemaCore = z.object({
  bytecodeFileId: z
    .string()
    .optional()
    .describe(
      'The ID of the file containing the contract bytecode. Use this OR bytecodeHex.'
    ),
  bytecodeHex: z
    .string()
    .optional()
    .describe(
      'The contract bytecode as a hex-encoded string. Use this OR bytecodeFileId.'
    ),
  adminKey: z
    .string()
    .optional()
    .describe(
      'Optional. Admin key as a hex-encoded private key string or a serialized public key string.'
    ),
  gas: z
    .union([z.number(), z.string()])
    .describe(
      'Gas to deploy the contract (number or string for large values).'
    ),
  initialBalance: z
    .union([z.number(), z.string()])
    .optional()
    .describe(
      'Optional. Initial balance in HBAR (e.g., 10) or tinybars as string (e.g., "1000000000") to send to the contract (for payable constructor).'
    ),
  constructorParametersHex: z
    .string()
    .optional()
    .describe('Optional. Constructor parameters as a hex-encoded string.'),
  // memo is in metaOptions
  autoRenewPeriod: z
    .number()
    .int()
    .optional()
    .describe('Optional. Auto-renewal period in seconds.'),
  stakedAccountId: z
    .string()
    .optional()
    .describe('Optional. Account ID to stake to.'),
  stakedNodeId: z
    .number()
    .int()
    .optional()
    .describe('Optional. Node ID to stake to.'),
  declineStakingReward: z
    .boolean()
    .optional()
    .describe('Optional. If true, decline staking rewards.'),
  maxAutomaticTokenAssociations: z
    .number()
    .int()
    .optional()
    .describe('Optional. Max automatic token associations for the contract.'),
});

export class HederaCreateContractTool extends BaseHederaTransactionTool<
  typeof CreateContractZodSchemaCore
> {
  name = 'hedera-scs-create-contract';
  description =
    'Creates/deploys a new Hedera smart contract. Provide bytecode (as hex string or file ID) and gas. Other params optional. Use metaOptions for execution control.';
  specificInputSchema = CreateContractZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.scs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof CreateContractZodSchemaCore>
  ): Promise<void> {
    if (!specificArgs.bytecodeFileId && !specificArgs.bytecodeHex) {
      throw new Error('Either bytecodeFileId or bytecodeHex must be provided.');
    }
    if (specificArgs.bytecodeFileId && specificArgs.bytecodeHex) {
      throw new Error(
        'Cannot provide both bytecodeFileId and bytecodeHex. Choose one.'
      );
    }

    const contractParams: CreateContractParams = {
      gas:
        typeof specificArgs.gas === 'string'
          ? Long.fromString(specificArgs.gas)
          : Long.fromNumber(specificArgs.gas),
    };

    if (specificArgs.bytecodeFileId) {
      contractParams.bytecodeFileId = specificArgs.bytecodeFileId;
    } else if (specificArgs.bytecodeHex) {
      try {
        contractParams.bytecode = Buffer.from(specificArgs.bytecodeHex, 'hex');
      } catch (e) {
        this.logger.error('Failed to decode bytecodeHex', e);
        throw new Error('Invalid bytecodeHex string.');
      }
    }

    if (specificArgs.adminKey) contractParams.adminKey = specificArgs.adminKey;
    if (specificArgs.initialBalance) {
      contractParams.initialBalance =
        typeof specificArgs.initialBalance === 'string'
          ? new BigNumber(specificArgs.initialBalance) // Assume string might be tinybar for BigNumber Hbar conversion
          : specificArgs.initialBalance; // Number assumed to be HBAR for BigNumber Hbar conversion
    }
    if (specificArgs.constructorParametersHex) {
      try {
        contractParams.constructorParameters = Buffer.from(
          specificArgs.constructorParametersHex,
          'hex'
        );
      } catch (e) {
        this.logger.error('Failed to decode constructorParametersHex', e);
        throw new Error('Invalid constructorParametersHex string.');
      }
    }
    if (specificArgs.autoRenewPeriod)
      contractParams.autoRenewPeriod = specificArgs.autoRenewPeriod;
    if (specificArgs.stakedAccountId)
      contractParams.stakedAccountId = specificArgs.stakedAccountId;
    if (specificArgs.stakedNodeId)
      contractParams.stakedNodeId = Long.fromNumber(specificArgs.stakedNodeId);
    if (specificArgs.declineStakingReward)
      contractParams.declineStakingReward = specificArgs.declineStakingReward;
    if (specificArgs.maxAutomaticTokenAssociations)
      contractParams.maxAutomaticTokenAssociations =
        specificArgs.maxAutomaticTokenAssociations;

    (builder as ScsBuilder).createContract(contractParams);
  }
}
