import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetAccountTokensZodSchema = z.object({
  accountId: z
    .string()
    .describe('The account ID to get token balances for (e.g., "0.0.12345")'),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .default(100)
    .describe('Maximum number of tokens to return (default: 100)'),
});

/**
 * Tool for retrieving token balances for a Hedera account.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetAccountTokensTool extends BaseHederaQueryTool<
  typeof GetAccountTokensZodSchema
> {
  name = 'hedera-get-account-tokens';
  description =
    'Retrieves all token balances for a Hedera account. Returns fungible and non-fungible token associations.';
  specificInputSchema = GetAccountTokensZodSchema;
  namespace = 'account';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetAccountTokensZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting tokens for account ID: ${args.accountId}`);
    
    const tokens = await this.hederaKit.query().getAccountTokens(args.accountId, args.limit);
    
    if (!tokens) {
      return {
        success: false,
        error: `Could not retrieve tokens for account ${args.accountId}`,
      };
    }

    return {
      success: true,
      accountId: args.accountId,
      tokenCount: tokens.length,
      tokens,
    };
  }
} 
 