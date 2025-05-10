import { z } from 'zod';
import { ApproveTokenNftAllowanceParams } from '../../../types';
import { Long } from '@hashgraph/sdk';
import { BigNumber } from 'bignumber.js'; // For parsing serials if provided as strings by LLM
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
      'The NFT owner account ID (e.g., "0.0.xxxx"). Defaults to operator.'
    ),
  spenderAccountId: z
    .string()
    .describe('The spender account ID (e.g., "0.0.yyyy").'),
  tokenId: z.string().describe('The NFT collection ID (e.g., "0.0.zzzz").'),
  serials: z
    .array(z.union([z.number(), z.string()]))
    .optional()
    .describe(
      'Optional. Specific serial numbers (as numbers or strings) to approve. Use this OR allSerials.'
    ),
  allSerials: z
    .boolean()
    .optional()
    .describe(
      'Optional. If true, approves the spender for all serials of the given NFT ID. Use this OR serials.'
    ),
});

export class HederaApproveTokenNftAllowanceTool extends BaseHederaTransactionTool<
  typeof ApproveTokenNftAllowanceZodSchemaCore
> {
  name = 'hedera-account-approve-nft-allowance';
  description =
    'Approves an NFT allowance. Requires spenderAccountId, tokenId, and EITHER a list of serials OR allSerials=true. ownerAccountId defaults to operator. Use metaOptions for execution control.';
  specificInputSchema = ApproveTokenNftAllowanceZodSchemaCore;

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
    if (
      !specificArgs.allSerials &&
      (!specificArgs.serials || specificArgs.serials.length === 0)
    ) {
      throw new Error(
        'For NFT allowance, either specify `serials` array or set `allSerials` to true.'
      );
    }
    if (
      specificArgs.allSerials &&
      specificArgs.serials &&
      specificArgs.serials.length > 0
    ) {
      throw new Error(
        'Cannot specify both `serials` and `allSerials: true` for NFT allowance. Choose one.'
      );
    }

    const allowanceParams: ApproveTokenNftAllowanceParams = {
      spenderAccountId: specificArgs.spenderAccountId,
      tokenId: specificArgs.tokenId,
    };
    if (specificArgs.ownerAccountId ) {
      allowanceParams.ownerAccountId = specificArgs.ownerAccountId;
    }
    if (specificArgs.allSerials) {
      allowanceParams.allSerials = true;
    } else if (specificArgs.serials) {
      // AccountBuilder.approveTokenNftAllowance expects serials as Array<number | Long | BigNumber>
      allowanceParams.serials = specificArgs.serials.map((s) =>
        typeof s === 'string' ? new BigNumber(s) : s
      ) as Array<number | Long | BigNumber>;
    }

    (builder as AccountBuilder).approveTokenNftAllowance(allowanceParams);
  }
}
