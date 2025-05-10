import { z } from 'zod';
import { UpdateContractParams, Key } from '../../../types';
import { AccountId, Long } from '@hashgraph/sdk';
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
    .optional()
    .describe(
      'Optional. New admin key (serialized string or "null" to clear).'
    ),
  autoRenewPeriod: z
    .number()
    .int()
    .optional()
    .describe('Optional. New auto-renewal period in seconds.'),
  memo: z
    .string()
    .optional()
    .describe(
      'Optional. New contract memo. Send "null" or empty string to clear.'
    ),
  stakedAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. New account ID to stake to. Use "0.0.0" or "null" to remove staking.'
    ),
  stakedNodeId: z
    .number()
    .int()
    .optional()
    .describe(
      'Optional. New node ID to stake to. Use -1, or omit/send undefined with stakedAccountId="0.0.0" to remove staking.'
    ),
  declineStakingReward: z
    .boolean()
    .optional()
    .describe(
      'Optional. If true, the contract declines receiving a staking reward.'
    ),
  maxAutomaticTokenAssociations: z
    .number()
    .int()
    .optional()
    .describe('Optional. New max automatic token associations.'),
  proxyAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. New proxy account ID. Use "0.0.0" or "null" to clear.'
    ),
});

export class HederaUpdateContractTool extends BaseHederaTransactionTool<
  typeof UpdateContractZodSchemaCore
> {
  name = 'hedera-scs-update-contract';
  description =
    'Updates an existing Hedera smart contract. Requires contractId and fields to update. Use metaOptions for execution control.';
  specificInputSchema = UpdateContractZodSchemaCore;

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
    const updateParams: UpdateContractParams = {
      contractId: specificArgs.contractId,
    };

    const valOrNull = (val: string | undefined): string | null | undefined =>
      val === undefined ? undefined : val === 'null' || val === '' ? null : val;
    const keyOrNull = (
      val: string | undefined
    ): string | Key | null | undefined =>
      val === undefined ? undefined : val === 'null' ? null : val;
    const accountIdOrClearString = (
      val: string | undefined
    ): string | AccountId | '0.0.0' | null | undefined => {
      if (val === undefined) return undefined;
      if (val === 'null' || val.toLowerCase() === '0.0.0') return '0.0.0';
      return val;
    };

    let processedVal: any;

    if (specificArgs.adminKey) {
      processedVal = keyOrNull(specificArgs.adminKey);
      if (processedVal) updateParams.adminKey = processedVal;
    }
    if (specificArgs.autoRenewPeriod) {
      updateParams.autoRenewPeriod = specificArgs.autoRenewPeriod;
    }
    if (specificArgs.memo) {
      processedVal = valOrNull(specificArgs.memo);
      if (processedVal) updateParams.memo = processedVal;
    }
    if (specificArgs.stakedAccountId) {
      processedVal = accountIdOrClearString(specificArgs.stakedAccountId);
      if (processedVal) updateParams.stakedAccountId = processedVal;
    }
    if (specificArgs.stakedNodeId) {
      updateParams.stakedNodeId =
        specificArgs.stakedNodeId === -1
          ? Long.fromNumber(-1)
          : Long.fromNumber(specificArgs.stakedNodeId);
    } else if (updateParams.stakedAccountId === '0.0.0') {
      updateParams.stakedNodeId = Long.fromNumber(-1); // Clear node if account is cleared
    }
    if (specificArgs.declineStakingReward) {
      updateParams.declineStakingReward = specificArgs.declineStakingReward;
    }
    if (specificArgs.maxAutomaticTokenAssociations) {
      updateParams.maxAutomaticTokenAssociations =
        specificArgs.maxAutomaticTokenAssociations;
    }
    if (specificArgs.proxyAccountId) {
      processedVal = accountIdOrClearString(specificArgs.proxyAccountId);
      if (processedVal) updateParams.proxyAccountId = processedVal;
    }

    (builder as ScsBuilder).updateContract(updateParams);
  }
}
