import { z } from 'zod';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { AccountBuilder } from '../../../builders/account/account-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { DeleteNftSpenderAllowanceToolParams } from '../../../types';

const DeleteNftSpenderAllowanceZodSchemaCore = z.object({
  ownerAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. The ID of the NFT owner. Defaults to the operator/signer if not provided.'
    ),
  spenderAccountId: z
    .string()
    .describe(
      'The ID of the spender whose allowance for specific NFTs will be deleted.'
    ),

  nftIdString: z
    .string()
    .describe(
      'The NFT ID including serial number (e.g., "0.0.token.serial") for which the allowance will be deleted.'
    ),

  tokenId: z
    .string()
    .describe('The token ID of the NFT collection (e.g., "0.0.xxxx").'),
  serials: z
    .array(z.union([z.number().int().positive(), z.string()]))
    .min(1)
    .describe('An array of serial numbers of the NFT to remove allowance for.'),
});

export class HederaDeleteNftSpenderAllowanceTool extends BaseHederaTransactionTool<
  typeof DeleteNftSpenderAllowanceZodSchemaCore
> {
  name = 'hedera-account-delete-nft-spender-allowance';
  description =
    'Deletes/revokes NFT allowances for specific serial numbers of a token for a specific spender. The owner of the NFTs must sign.';
  specificInputSchema = DeleteNftSpenderAllowanceZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof DeleteNftSpenderAllowanceZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).deleteTokenNftAllowanceForSpender(
      specificArgs as unknown as DeleteNftSpenderAllowanceToolParams
    );
  }
}
