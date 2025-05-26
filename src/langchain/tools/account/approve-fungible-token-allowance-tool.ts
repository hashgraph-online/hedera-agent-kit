import { z } from 'zod';
import { ApproveFungibleTokenAllowanceParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const ApproveFungibleTokenAllowanceZodSchemaCore = z.object({
  ownerAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. The token owner account ID (e.g., "0.0.xxxx"). Defaults to operator.'
    ),
  spenderAccountId: z
    .string()
    .describe('The spender account ID (e.g., "0.0.yyyy").'),
  tokenId: z.string().describe('The fungible token ID (e.g., "0.0.zzzz").'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'Max token amount (smallest unit) spender can use. Builder handles conversion.'
    ),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaApproveFungibleTokenAllowanceTool extends BaseHederaTransactionTool<
  typeof ApproveFungibleTokenAllowanceZodSchemaCore
> {
  name = 'hedera-account-approve-fungible-token-allowance';
  description =
    'Approves a fungible token allowance for a spender. Builder handles amount conversion.';
  specificInputSchema = ApproveFungibleTokenAllowanceZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof ApproveFungibleTokenAllowanceZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).approveFungibleTokenAllowance(
      specificArgs as unknown as ApproveFungibleTokenAllowanceParams
    );
  }
}
