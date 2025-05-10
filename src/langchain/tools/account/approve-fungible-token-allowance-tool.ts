import { z } from 'zod';
import { ApproveFungibleTokenAllowanceParams } from '../../../types';
import { BigNumber } from 'bignumber.js';
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
      'The token owner account ID (e.g., "0.0.xxxx"). Defaults to operator.'
    ),
  spenderAccountId: z
    .string()
    .describe('The spender account ID (e.g., "0.0.yyyy").'),
  tokenId: z.string().describe('The fungible token ID (e.g., "0.0.zzzz").'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'The maximum amount of the token (smallest unit) the spender can use. Number or string for large values.'
    ),
});

export class HederaApproveFungibleTokenAllowanceTool extends BaseHederaTransactionTool<
  typeof ApproveFungibleTokenAllowanceZodSchemaCore
> {
  name = 'hedera-account-approve-fungible-token-allowance';
  description =
    'Approves a fungible token allowance for a spender. Requires spenderAccountId, tokenId, and amount. ownerAccountId defaults to operator. Use metaOptions for execution control.';
  specificInputSchema = ApproveFungibleTokenAllowanceZodSchemaCore;

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
    const allowanceParams: ApproveFungibleTokenAllowanceParams = {
      spenderAccountId: specificArgs.spenderAccountId,
      tokenId: specificArgs.tokenId,
      amount:
        typeof specificArgs.amount === 'string'
          ? new BigNumber(specificArgs.amount)
          : specificArgs.amount,
    };
    if (specificArgs.ownerAccountId ) {
      allowanceParams.ownerAccountId = specificArgs.ownerAccountId;
    }
    (builder as AccountBuilder).approveFungibleTokenAllowance(allowanceParams);
  }
}
