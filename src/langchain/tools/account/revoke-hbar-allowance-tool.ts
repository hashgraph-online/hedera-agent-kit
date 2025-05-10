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
      'The HBAR owner account ID (e.g., "0.0.xxxx"). Defaults to operator.'
    ),
  spenderAccountId: z
    .string()
    .describe(
      'The spender account ID whose HBAR allowance is to be revoked (e.g., "0.0.yyyy").'
    ),
});

export class HederaRevokeHbarAllowanceTool extends BaseHederaTransactionTool<
  typeof RevokeHbarAllowanceZodSchemaCore
> {
  name = 'hedera-account-revoke-hbar-allowance';
  description =
    'Revokes/clears an HBAR allowance for a spender by setting it to zero. Requires spenderAccountId. ownerAccountId defaults to operator. Use metaOptions for execution control.';
  specificInputSchema = RevokeHbarAllowanceZodSchemaCore;

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
    const revokeParams: RevokeHbarAllowanceParams = {
      spenderAccountId: specificArgs.spenderAccountId,
    };
    if (specificArgs.ownerAccountId ) {
      revokeParams.ownerAccountId = specificArgs.ownerAccountId;
    }
    (builder as AccountBuilder).revokeHbarAllowance(revokeParams);
  }
}
