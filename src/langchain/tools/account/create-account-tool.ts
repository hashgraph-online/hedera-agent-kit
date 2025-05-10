import { z } from 'zod';
import { CreateAccountParams } from '../../../types';
import { Long } from '@hashgraph/sdk';
import { BigNumber } from 'bignumber.js';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const CreateAccountZodSchemaCore = z.object({
  key: z
    .string()
    .describe(
      'Public key string (hex) or private key string (hex) for the new account.'
    ),
  initialBalance: z
    .union([z.number(), z.string()])
    .optional()
    .describe(
      'Initial balance in HBAR (e.g., 100) or tinybars as string (e.g., "10000000000"). Defaults to 0.'
    ),
  memo: z.string().optional().describe('Optional memo for the account.'),
  receiverSignatureRequired: z
    .boolean()
    .optional()
    .describe(
      'If true, the account must sign any transaction transferring hbar out of this account.'
    ),
  maxAutomaticTokenAssociations: z
    .number()
    .int()
    .optional()
    .describe('Max automatic token associations.'),
  stakedAccountId: z.string().optional().describe('Account ID to stake to.'),
  stakedNodeId: z.number().int().optional().describe('Node ID to stake to.'), // SDK uses Long, but number is simpler for Zod
  declineStakingReward: z
    .boolean()
    .optional()
    .describe('If true, decline staking rewards.'),
  alias: z
    .string()
    .optional()
    .describe(
      'Account alias (e.g., EVM address as a hex string, or a serialized PublicKey string).'
    ),
  // autoRenewPeriod and autoRenewAccountId are not directly on AccountCreateTransaction using simple setters, usually defaults.
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Zod schema compatibility issue
export class HederaCreateAccountTool extends BaseHederaTransactionTool<
  typeof CreateAccountZodSchemaCore
> {
  name = 'hedera-account-create'; // Simplified name
  description =
    'Creates a new Hedera account. Requires a key (public or private string). Other fields optional. Use metaOptions for execution control.';
  specificInputSchema = CreateAccountZodSchemaCore;

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
    const accountParams: CreateAccountParams = {
      key: specificArgs.key,
    };

    if (specificArgs.initialBalance ) {
      if (typeof specificArgs.initialBalance === 'string') {
        accountParams.initialBalance = new BigNumber(
          specificArgs.initialBalance
        );
      } else {
        accountParams.initialBalance = specificArgs.initialBalance; // Pass number directly
      }
    }
    if (specificArgs.memo ) {
      accountParams.memo = specificArgs.memo;
    }
    if (specificArgs.receiverSignatureRequired ) {
      accountParams.receiverSignatureRequired =
        specificArgs.receiverSignatureRequired;
    }
    if (specificArgs.maxAutomaticTokenAssociations ) {
      accountParams.maxAutomaticTokenAssociations =
        specificArgs.maxAutomaticTokenAssociations;
    }
    if (specificArgs.stakedAccountId ) {
      accountParams.stakedAccountId = specificArgs.stakedAccountId;
    }
    if (specificArgs.stakedNodeId ) {
      accountParams.stakedNodeId = Long.fromNumber(specificArgs.stakedNodeId); // Convert number to Long
    }
    if (specificArgs.declineStakingReward ) {
      accountParams.declineStakingReward = specificArgs.declineStakingReward;
    }
    if (specificArgs.alias ) {
      // The builder's createAccount expects EvmAddress | string (for EVM) or PublicKey for alias.
      // For simplicity, tool takes string. If it's an EVM address, pass as is.
      // If it's intended as a PublicKey alias, the builder or SDK might need it as PublicKey object.
      // AccountCreateTransaction.setAlias can take PublicKey or EvmAddress.
      // For string input, it's safer to assume it could be an EVM address string.
      // If it's a DER-encoded public key string, it needs parsing. For now, pass string.
      accountParams.alias = specificArgs.alias;
    }

    (builder as AccountBuilder).createAccount(accountParams);
  }
}
