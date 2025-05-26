import { z } from 'zod';
import { RevokeFungibleTokenAllowanceParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const RevokeFungibleTokenAllowanceZodSchemaCore = z.object({
  ownerAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. The token owner account ID (e.g., "0.0.xxxx"). Defaults to operator.'
    ),
  spenderAccountId: z
    .string()
    .describe(
      'The spender account ID whose token allowance is to be revoked (e.g., "0.0.yyyy").'
    ),
  tokenId: z
    .string()
    .describe('The ID of the fungible token (e.g., "0.0.zzzz").'),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaRevokeFungibleTokenAllowanceTool extends BaseHederaTransactionTool<
  typeof RevokeFungibleTokenAllowanceZodSchemaCore
> {
  name = 'hedera-account-revoke-fungible-token-allowance';
  description =
    'Revokes/clears a fungible token allowance for a specific spender by approving zero amount.';
  specificInputSchema = RevokeFungibleTokenAllowanceZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof RevokeFungibleTokenAllowanceZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).revokeFungibleTokenAllowance(
      specificArgs as unknown as RevokeFungibleTokenAllowanceParams
    );
  }
}
