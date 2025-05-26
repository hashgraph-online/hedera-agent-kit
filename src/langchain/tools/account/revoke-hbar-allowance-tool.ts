import { z } from 'zod';
import { RevokeHbarAllowanceParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const RevokeHbarAllowanceZodSchemaCore = z.object({
  ownerAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. The HBAR owner account ID (e.g., "0.0.xxxx"). Defaults to operator.'
    ),
  spenderAccountId: z
    .string()
    .describe(
      'The spender account ID whose HBAR allowance is to be revoked (e.g., "0.0.yyyy").'
    ),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaRevokeHbarAllowanceTool extends BaseHederaTransactionTool<
  typeof RevokeHbarAllowanceZodSchemaCore
> {
  name = 'hedera-account-revoke-hbar-allowance';
  description =
    'Revokes/clears an HBAR allowance for a specific spender by approving zero HBAR.';
  specificInputSchema = RevokeHbarAllowanceZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof RevokeHbarAllowanceZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).revokeHbarAllowance(
      specificArgs as unknown as RevokeHbarAllowanceParams
    );
  }
}
