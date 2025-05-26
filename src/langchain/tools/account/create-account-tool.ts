import { z } from 'zod';
import { CreateAccountParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const CreateAccountZodSchemaCore = z.object({
  key: z
    .string()
    .optional()
    .describe(
      'Optional. Public key string (hex) or private key string for the new account. Used if alias is not set. Builder validates presence of key or alias.'
    ),
  alias: z
    .string()
    .optional()
    .describe(
      'Optional. Account alias (e.g., EVM address or serialized PublicKey string). Takes precedence over key. Builder validates presence of key or alias.'
    ),
  initialBalance: z
    .union([z.number(), z.string()])
    .optional()
    .describe(
      'Optional. Initial balance in HBAR. Builder handles conversion. Defaults to 0.'
    ),
  memo: z.string().optional().describe('Optional. Memo for the account.'),
  autoRenewAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. Account ID for auto-renewal payments (e.g., "0.0.xxxx").'
    ),
  autoRenewPeriod: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional. Auto-renewal period in seconds (e.g., 7776000 for 90 days).'
    ),
  receiverSignatureRequired: z
    .boolean()
    .optional()
    .describe('Optional. If true, account must sign transfers out of it.'),
  maxAutomaticTokenAssociations: z
    .number()
    .int()
    .optional()
    .describe('Optional. Max automatic token associations for the account.'),
  stakedAccountId: z
    .string()
    .optional()
    .describe('Optional. Account ID to stake to (e.g., "0.0.zzzz").'),
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
    .describe('Optional. If true, decline staking rewards.'),
});

export class HederaCreateAccountTool extends BaseHederaTransactionTool<
  typeof CreateAccountZodSchemaCore
> {
  name = 'hedera-account-create';
  description =
    'Creates a new Hedera account. Requires key or alias (builder validates). Builder handles parsing and defaults.';
  specificInputSchema = CreateAccountZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof CreateAccountZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).createAccount(
      specificArgs as unknown as CreateAccountParams
    );
  }
}
