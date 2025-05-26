import { z } from 'zod';
import { BurnNFTParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const BurnNFTZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the NFT collection (e.g., "0.0.xxxx").'),
  serials: z
    .array(z.union([z.number().int().positive(), z.string()]))
    .min(1)
    .describe(
      'Array of serial numbers to burn. Numbers or strings for large serials. Builder handles conversion.'
    ),
});

export class HederaBurnNftTool extends BaseHederaTransactionTool<
  typeof BurnNFTZodSchemaCore
> {
  name = 'hedera-hts-burn-nft';
  description =
    'Burns Non-Fungible Tokens (NFTs). Requires token ID and an array of serial numbers.';
  specificInputSchema = BurnNFTZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof BurnNFTZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).burnNonFungibleToken(
      specificArgs as unknown as BurnNFTParams
    );
  }
}
