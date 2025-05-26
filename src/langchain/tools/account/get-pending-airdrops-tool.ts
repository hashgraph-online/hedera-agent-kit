import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetPendingAirdropsZodSchema = z.object({
  accountId: z
    .string()
    .describe('The account ID that received the airdrops (e.g., "0.0.123")'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of airdrops to return'),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Order of results'),
  senderId: z
    .string()
    .optional()
    .describe('Filter by sender account ID'),
  serialNumber: z
    .string()
    .optional()
    .describe('Filter by NFT serial number'),
  tokenId: z
    .string()
    .optional()
    .describe('Filter by token ID'),
});

/**
 * Tool for retrieving pending token airdrops received by an account.
 */
export class HederaGetPendingAirdropsTool extends BaseHederaQueryTool<
  typeof GetPendingAirdropsZodSchema
> {
  name = 'hedera-get-pending-airdrops';
  description =
    'Retrieves pending token airdrops that have been received by an account but not yet claimed.';
  specificInputSchema = GetPendingAirdropsZodSchema;
  namespace = 'account';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetPendingAirdropsZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting pending airdrops for account: ${args.accountId}`);

    const airdrops = await this.hederaKit
      .query()
      .getPendingTokenAirdrops(args);

    if (!airdrops) {
      return {
        success: false,
        error: `Could not retrieve pending airdrops for account ${args.accountId}`,
      };
    }

    return {
      success: true,
      accountId: args.accountId,
      airdrops,
      count: airdrops.length,
    };
  }
} 
 