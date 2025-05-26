import { z } from 'zod';
import { DeleteAccountParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const DeleteAccountZodSchemaCore = z.object({
  deleteAccountId: z
    .string()
    .describe(
      'The ID of the account to be deleted (e.g., "0.0.xxxx"). This account must sign.'
    ),
  transferAccountId: z
    .string()
    .describe(
      'The ID of the account to transfer the remaining HBAR balance to (e.g., "0.0.yyyy").'
    ),
});

export class HederaDeleteAccountTool extends BaseHederaTransactionTool<
  typeof DeleteAccountZodSchemaCore
> {
  name = 'hedera-account-delete';
  description =
    'Deletes an account, transferring its HBAR balance to another account.';
  specificInputSchema = DeleteAccountZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof DeleteAccountZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).deleteAccount(
      specificArgs as unknown as DeleteAccountParams
    );
  }
}
