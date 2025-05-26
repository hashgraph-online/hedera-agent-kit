import { z } from 'zod';
import { CreateContractParams } from '../../../types';
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
      'Optional. File ID of contract bytecode. Used if bytecodeHex not set. Builder validates choice.'
    ),
  bytecodeHex: z
    .string()
    .optional()
    .describe(
      'Optional. Contract bytecode as hex string. Used if bytecodeFileId not set. Builder validates choice & decodes.'
    ),
  adminKey: z
    .string()
    .optional()
    .describe(
      'Optional. Admin key (serialized string). Builder handles parsing.'
    ),
  gas: z
    .union([z.number(), z.string()])
    .describe(
      'Gas to deploy (number or string). Builder handles Long conversion.'
    ),
  initialBalance: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Optional. Initial balance in HBAR. Builder handles conversion.'),
  constructorParametersHex: z
    .string()
    .optional()
    .describe(
      'Optional. Constructor parameters as hex string. Builder decodes.'
    ),
  memo: z
    .string()
    .optional()
    .describe('Optional. Memo for the contract creation transaction.'),
  autoRenewPeriod: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional. Auto-renewal period in seconds.'),
  stakedAccountId: z
    .string()
    .optional()
    .describe('Optional. Account ID to stake to (e.g., "0.0.xxxx").'),
  stakedNodeId: z
    .number()
    .int()
    .optional()
    .describe(
      'Optional. Node ID to stake to. Builder handles Long conversion.'
    ),
  declineStakingReward: z
    .boolean()
    .optional()
    .describe('Optional. If true, contract declines staking rewards.'),
  maxAutomaticTokenAssociations: z
    .number()
    .int()
    .optional()
    .describe('Optional. Max automatic token associations for the contract.'),
});
// Validation for bytecodeFileId vs bytecodeHex is builder's responsibility.

export class HederaCreateContractTool extends BaseHederaTransactionTool<
  typeof CreateContractZodSchemaCore
> {
  name = 'hedera-scs-create-contract';
  description =
    'Creates/deploys a new Hedera smart contract. Builder handles parsing, conversions, and validation of inputs (e.g., bytecode source).';
  specificInputSchema = CreateContractZodSchemaCore;
  namespace = 'scs';

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
    await (builder as ScsBuilder).createContract(
      specificArgs as unknown as CreateContractParams
    );
  }
}
