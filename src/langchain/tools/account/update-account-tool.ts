import { z } from 'zod';
import { UpdateAccountParams, Key } from '../../../types';
import { AccountId, Long } from '@hashgraph/sdk';
import {
    BaseHederaTransactionTool,
    BaseHederaTransactionToolParams
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const UpdateAccountZodSchemaCore = z.object({
  accountIdToUpdate: z.string().describe('The ID of the account to update (e.g., \"0.0.xxxx\").'),
  key: z.string().optional().describe('Optional. New key (serialized string or \"null\" to clear - not typically allowed).'),
  autoRenewPeriod: z.number().int().optional().describe('Optional. New auto-renewal period in seconds.'),
  memo: z.string().optional().describe('Optional. New account memo. Send \"null\" or empty string to clear.'),
  maxAutomaticTokenAssociations: z.number().int().optional().describe('Optional. New max automatic token associations.'),
  stakedAccountId: z.string().optional().describe('Optional. New account ID to stake to. Use \"0.0.0\" or \"null\" to remove staking.'),
  stakedNodeId: z.number().int().optional().describe('Optional. New node ID to stake to. Use -1 or provide nothing to remove staking if stakedAccountId is also removed.'),
  declineStakingReward: z.boolean().optional().describe('Optional. If true, the account declines receiving a staking reward.'),
  receiverSignatureRequired: z.boolean().optional().describe('Optional. If true, this account must sign any transaction transferring hbar out of this account.'),
});

export class HederaUpdateAccountTool extends BaseHederaTransactionTool<typeof UpdateAccountZodSchemaCore> {
  name = 'hedera-account-update';
  description = 'Updates an existing Hedera account. Requires accountIdToUpdate and fields to update. Use metaOptions for execution control.';
  specificInputSchema = UpdateAccountZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof UpdateAccountZodSchemaCore>
  ): Promise<void> {
    const updateParams: UpdateAccountParams = { accountIdToUpdate: specificArgs.accountIdToUpdate };

    const valOrNull = (val: string | undefined): string | null | undefined => {
      if (val === undefined) return undefined;
      return (val === 'null' || val === '') ? null : val;
    };
    const keyOrNull = (val: string | undefined): string | Key | null | undefined => {
      if (val === undefined) return undefined;
      return val === 'null' ? null : val;
    };
    const stakedAccountIdOrNull = (val: string | undefined): string | AccountId | '0.0.0' | null | undefined => {
      if (val === undefined) return undefined;
      if (val === 'null' || val.toLowerCase() === '0.0.0') return '0.0.0'; // SDK uses "0.0.0" to clear stakedAccountId
      return val;
    };
    const stakedNodeIdOrNull = (val: number | undefined): number | Long | null | undefined => {
        if (val === undefined) return undefined;
        if (val === -1) return Long.fromNumber(-1); // SDK uses -1 to clear stakedNodeId
        return Long.fromNumber(val);
    };

    let processedVal: any;

    if (specificArgs.key ) {
      processedVal = keyOrNull(specificArgs.key);
      if (processedVal ) updateParams.key = processedVal;
    }
    if (specificArgs.autoRenewPeriod ) {
      updateParams.autoRenewPeriod = specificArgs.autoRenewPeriod;
    }
    if (specificArgs.memo ) {
      processedVal = valOrNull(specificArgs.memo);
      if (processedVal ) updateParams.memo = processedVal;
    }
    if (specificArgs.maxAutomaticTokenAssociations ) {
      updateParams.maxAutomaticTokenAssociations = specificArgs.maxAutomaticTokenAssociations;
    }
    if (specificArgs.stakedAccountId ) {
      processedVal = stakedAccountIdOrNull(specificArgs.stakedAccountId);
      if (processedVal ) updateParams.stakedAccountId = processedVal;
    }
    if (specificArgs.stakedNodeId ) {
        processedVal = stakedNodeIdOrNull(specificArgs.stakedNodeId);
        if (processedVal  ) updateParams.stakedNodeId = processedVal;
    } else if (updateParams.stakedAccountId === '0.0.0' && specificArgs.stakedNodeId === undefined) {
        // If stakedAccountId is cleared, also clear stakedNodeId by setting it to -1 if not otherwise specified
        updateParams.stakedNodeId = Long.fromNumber(-1);
    }

    if (specificArgs.declineStakingReward ) {
      updateParams.declineStakingReward = specificArgs.declineStakingReward;
    }
    if (specificArgs.receiverSignatureRequired ) {
      updateParams.receiverSignatureRequired = specificArgs.receiverSignatureRequired;
    }

    (builder as AccountBuilder).updateAccount(updateParams);
  }
}