import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetTokenInfoZodSchema = z.object({
  tokenId: z
    .string()
    .describe('The token ID to get information for (e.g., "0.0.12345")'),
});

/**
 * Tool for retrieving Hedera Token Service token information.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetTokenInfoTool extends BaseHederaQueryTool<
  typeof GetTokenInfoZodSchema
> {
  name = 'hedera-get-token-info';
  description =
    'Retrieves comprehensive information about a Hedera token including name, symbol, supply, keys, and other metadata.';
  specificInputSchema = GetTokenInfoZodSchema;
  namespace = 'hts';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetTokenInfoZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting token info for token ID: ${args.tokenId}`);

    const tokenInfo = await this.hederaKit.query().getTokenInfo(args.tokenId);

    if (!tokenInfo) {
      return {
        success: false,
        error: `Token ${args.tokenId} not found`,
      };
    }

    return {
      success: true,
      tokenInfo,
    };
  }
}

 