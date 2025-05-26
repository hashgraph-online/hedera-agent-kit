import { z } from 'zod';
import { UpdateContractParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { ScsBuilder } from '../../../builders/scs/scs-builder';

const UpdateContractZodSchemaCore = z.object({
  contractId: z
    .string()
    .describe('The ID of the contract to update (e.g., "0.0.xxxx").'),
  adminKey: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Optional. New admin key (serialized string). Pass null to clear.'
    ),
  autoRenewPeriod: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional. New auto-renewal period in seconds.'),
  memo: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Optional. New contract memo. Pass null or empty string to clear.'
    ),
  stakedAccountId: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Optional. New account ID to stake to. Pass "0.0.0" or null to clear.'
    ),
  stakedNodeId: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe(
      'Optional. New node ID to stake to. Pass -1 or null to clear. Builder handles Long conversion.'
    ),
  declineStakingReward: z
    .boolean()
    .optional()
    .describe('Optional. If true, contract declines staking rewards.'),
  maxAutomaticTokenAssociations: z
    .number()
    .int()
    .optional()
    .describe('Optional. New max automatic token associations.'),
  proxyAccountId: z
    .string()
    .nullable()
    .optional()
    .describe('Optional. New proxy account ID. Pass "0.0.0" or null to clear.'),
});

export class HederaUpdateContractTool extends BaseHederaTransactionTool<
  typeof UpdateContractZodSchemaCore
> {
  name = 'hedera-scs-update-contract';
  description =
    'Updates an existing Hedera smart contract. Builder handles parsing and clearing logic.';
  specificInputSchema = UpdateContractZodSchemaCore;
  namespace = 'scs';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.scs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof UpdateContractZodSchemaCore>
  ): Promise<void> {
    await (builder as ScsBuilder).updateContract(
      specificArgs as unknown as UpdateContractParams
    );
  }
}
