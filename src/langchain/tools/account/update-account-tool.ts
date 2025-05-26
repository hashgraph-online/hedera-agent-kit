import { z } from 'zod';
import { UpdateAccountParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

/*
 * Zod schema defines the direct input expected from the LLM.
 * Omitted optional fields will result in no change to those account properties.
 * The builder translates provided values to SDK calls.
 */
const UpdateAccountZodSchemaCore = z.object({
  accountIdToUpdate: z.string().describe('The ID of the account to update (e.g., "0.0.12345").'),
  key: z.string().nullable().optional()
    .describe('Optional. New key (serialized string). Pass null to clear (if allowed by SDK). Builder handles parsing.'),
  autoRenewPeriod: z.number().int().positive().optional()
    .describe('Optional. New auto-renewal period in seconds (e.g., 7776000 for 90 days).'),
  memo: z.string().nullable().optional()
    .describe('Optional. New memo. Pass null or empty string to clear.'),
  maxAutomaticTokenAssociations: z.number().int().min(0).optional()
    .describe('Optional. New max automatic token associations (0-5000).'),
  stakedAccountId: z.string().nullable().optional()
    .describe('Optional. New account ID to stake to. Pass "0.0.0" or null to clear.'),
  stakedNodeId: z.number().int().nullable().optional()
    .describe('Optional. New node ID to stake to. Pass -1 or null to clear. Builder handles Long conversion.'),
  declineStakingReward: z.boolean().optional()
    .describe('Optional. If true, account declines staking rewards.'),
  receiverSignatureRequired: z.boolean().optional()
    .describe('Optional. If true, account must sign transfers out of it.'),
});

export class HederaUpdateAccountTool extends BaseHederaTransactionTool<
  typeof UpdateAccountZodSchemaCore
> {
  name = 'hedera-account-update';
  description =
    'Updates an existing Hedera account. Specify accountIdToUpdate and fields to change. Builder handles parsing and clearing logic.';
  specificInputSchema = UpdateAccountZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  /**
   * Passes the validated arguments directly to the AccountBuilder's updateAccount method.
   * The builder is responsible for all transformations and applying logic based on input values.
   * Omitted optional fields from the LLM mean those properties will not be targeted for update.
   */
  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof UpdateAccountZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).updateAccount(
      specificArgs as unknown as UpdateAccountParams
    );
  }
}
