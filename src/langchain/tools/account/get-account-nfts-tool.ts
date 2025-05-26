import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetAccountNftsZodSchema = z.object({
  accountId: z
    .string()
    .describe('The account ID to get NFTs for (e.g., "0.0.12345")'),
  tokenId: z
    .string()
    .optional()
    .describe('Optional token ID to filter NFTs by (e.g., "0.0.67890")'),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .default(100)
    .describe('Maximum number of NFTs to return (default: 100)'),
});

/**
 * Tool for retrieving NFTs owned by a Hedera account.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetAccountNftsTool extends BaseHederaQueryTool<
  typeof GetAccountNftsZodSchema
> {
  name = 'hedera-get-account-nfts';
  description =
    'Retrieves all NFTs owned by a Hedera account. Optionally filter by token ID.';
  specificInputSchema = GetAccountNftsZodSchema;
  namespace = 'account';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetAccountNftsZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting NFTs for account ID: ${args.accountId}`);
    
    const nfts = await this.hederaKit.query().getAccountNfts(
      args.accountId,
      args.tokenId,
      args.limit
    );
    
    if (!nfts) {
      return {
        success: false,
        error: `Could not retrieve NFTs for account ${args.accountId}`,
      };
    }

    return {
      success: true,
      accountId: args.accountId,
      tokenId: args.tokenId,
      nftCount: nfts.length,
      nfts,
    };
  }
} 
 