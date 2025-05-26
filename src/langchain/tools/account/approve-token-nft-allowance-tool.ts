import { z } from 'zod';
import { ApproveTokenNftAllowanceParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const ApproveTokenNftAllowanceZodSchemaCore = z.object({
  ownerAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. The NFT owner account ID (e.g., "0.0.xxxx"). Defaults to operator.'
    ),
  spenderAccountId: z
    .string()
    .describe('The spender account ID (e.g., "0.0.yyyy").'),
  tokenId: z.string().describe('The NFT collection ID (e.g., "0.0.zzzz").'),
  serials: z
    .array(z.union([z.number().int().positive(), z.string()]))
    .optional()
    .describe(
      'Optional. Specific serial numbers to approve. Use this OR allSerials. Builder handles conversion.'
    ),
  allSerials: z
    .boolean()
    .optional()
    .describe(
      'Optional. If true, approves spender for all serials of the NFT ID. Use this OR serials.'
    ),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaApproveTokenNftAllowanceTool extends BaseHederaTransactionTool<
  typeof ApproveTokenNftAllowanceZodSchemaCore
> {
  name = 'hedera-account-approve-nft-allowance';
  description =
    'Approves an NFT allowance. Builder validates serials/allSerials logic and handles serial conversion.';
  specificInputSchema = ApproveTokenNftAllowanceZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof ApproveTokenNftAllowanceZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).approveTokenNftAllowance(
      specificArgs as unknown as ApproveTokenNftAllowanceParams
    );
  }
}
