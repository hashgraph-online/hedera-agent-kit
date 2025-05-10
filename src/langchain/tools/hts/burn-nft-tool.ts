import { z } from 'zod';
import { BurnNFTParams } from '../../../types';
import { Long } from '@hashgraph/sdk';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const BurnNFTZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the NFT collection to burn from (e.g., "0.0.xxxx").'),
  serials: z
    .array(z.union([z.number(), z.string()]))
    .describe(
      'An array of serial numbers (number or string for large values) to burn.'
    ),
});

export class HederaBurnNftTool extends BaseHederaTransactionTool<
  typeof BurnNFTZodSchemaCore
> {
  name = 'hedera-hts-burn-nft';
  description =
    'Burns Non-Fungible Tokens (NFTs). Requires the token ID and an array of serial numbers. Use metaOptions for execution control.';
  specificInputSchema = BurnNFTZodSchemaCore;

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
    if (!specificArgs.serials || specificArgs.serials.length === 0) {
      throw new Error(
        'An array of serial numbers must be provided to burn NFTs.'
      );
    }

    const burnParams: BurnNFTParams = {
      tokenId: specificArgs.tokenId,
      // The HtsBuilder's burnNonFungibleToken method uses parseAmount internally for serials
      serials: specificArgs.serials as Array<number | Long | BigNumber>,
    };
    (builder as HtsBuilder).burnNonFungibleToken(burnParams);
  }
}
