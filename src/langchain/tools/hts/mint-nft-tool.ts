import { z } from 'zod';
import { MintNFTParams } from '../../../types';
import { Buffer } from 'buffer'; // For base64 decoding
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const MintNFTZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the NFT collection to mint into (e.g., "0.0.xxxx").'),
  metadataArray: z
    .array(z.string())
    .describe(
      'An array of metadata strings (base64 encoded for binary data) for each NFT to be minted.'
    ),
});

export class HederaMintNftTool extends BaseHederaTransactionTool<
  typeof MintNFTZodSchemaCore
> {
  name = 'hedera-hts-mint-nft';
  description =
    'Mints new Non-Fungible Tokens (NFTs) for a given NFT collection. Provide an array of metadata (base64 encoded for binary). Use metaOptions for execution control.';
  specificInputSchema = MintNFTZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof MintNFTZodSchemaCore>
  ): Promise<void> {
    if (
      !specificArgs.metadataArray ||
      specificArgs.metadataArray.length === 0
    ) {
      throw new Error(
        'metadataArray must be provided and non-empty for minting NFTs.'
      );
    }
    if (specificArgs.metadataArray.length > 10) {
      this.logger.warn(
        'Minting more than 10 NFTs at once may exceed transaction size limits. Consider smaller batches.'
      );
    }
    const metadataU8: Uint8Array[] = specificArgs.metadataArray.map(
      (metaString) => {
        try {
          if (
            /^[A-Za-z0-9+/]*={0,2}$/.test(metaString) &&
            metaString.length % 4 === 0
          ) {
            try {
              return Buffer.from(metaString, 'base64');
            } catch (e) {
              return Buffer.from(metaString, 'utf8');
            }
          } else {
            return Buffer.from(metaString, 'utf8');
          }
        } catch (e) {
          this.logger.error(
            `Failed to convert metadata string to Uint8Array: "${metaString.substring(
              0,
              20
            )}..."`,
            e
          );
          throw new Error('Invalid metadata string format.');
        }
      }
    );
    const mintParams: MintNFTParams = {
      tokenId: specificArgs.tokenId,
      metadata: metadataU8,
    };
    (builder as HtsBuilder).mintNonFungibleToken(mintParams);
  }
}
