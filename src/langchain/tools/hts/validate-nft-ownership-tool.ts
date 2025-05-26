import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const ValidateNftOwnershipZodSchema = z.object({
  accountId: z
    .string()
    .describe('The account ID to check ownership for (e.g., "0.0.12345")'),
  tokenId: z
    .string()
    .describe('The NFT token ID (e.g., "0.0.67890")'),
  serialNumber: z
    .number()
    .int()
    .positive()
    .describe('The serial number of the NFT'),
});

/**
 * Tool for validating NFT ownership on Hedera.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaValidateNftOwnershipTool extends BaseHederaQueryTool<
  typeof ValidateNftOwnershipZodSchema
> {
  name = 'hedera-validate-nft-ownership';
  description =
    'Validates whether a specific account owns a particular NFT by token ID and serial number.';
  specificInputSchema = ValidateNftOwnershipZodSchema;
  namespace = 'hts';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof ValidateNftOwnershipZodSchema>
  ): Promise<unknown> {
    this.logger.info(
      `Validating NFT ownership: account ${args.accountId}, token ${args.tokenId}, serial ${args.serialNumber}`
    );
    
    const nftDetail = await this.hederaKit.query().validateNftOwnership(
      args.accountId,
      args.tokenId,
      args.serialNumber
    );
    
    const isOwned = nftDetail !== null;

    return {
      success: true,
      accountId: args.accountId,
      tokenId: args.tokenId,
      serialNumber: args.serialNumber,
      isOwned,
      nftDetail: isOwned ? nftDetail : null,
    };
  }
} 
 