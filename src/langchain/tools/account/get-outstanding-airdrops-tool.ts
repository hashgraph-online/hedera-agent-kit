import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetOutstandingAirdropsZodSchema = z.object({
  accountId: z
    .string()
    .describe('The account ID that sent the airdrops (e.g., "0.0.123")'),
  limit: z.number().optional().describe('Maximum number of airdrops to return'),
  order: z.enum(['asc', 'desc']).optional().describe('Order of results'),
  receiverId: z.string().optional().describe('Filter by receiver account ID'),
  serialNumber: z.string().optional().describe('Filter by NFT serial number'),
  tokenId: z.string().optional().describe('Filter by token ID'),
});

/**
 * Tool for retrieving outstanding token airdrops sent by an account.
 */
export class HederaGetOutstandingAirdropsTool extends BaseHederaQueryTool<
  typeof GetOutstandingAirdropsZodSchema
> {
  name = 'hedera-get-outstanding-airdrops';
  description =
    'Retrieves outstanding token airdrops that have been sent by an account but not yet claimed.';
  specificInputSchema = GetOutstandingAirdropsZodSchema;
  namespace = 'account';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetOutstandingAirdropsZodSchema>
  ): Promise<unknown> {
    this.logger.info(
      `Getting outstanding airdrops for account: ${args.accountId}`
    );

    const airdrops = await this.hederaKit
      .query()
      .getOutstandingTokenAirdrops(args);

    if (airdrops === null) {
      return {
        success: false,
        error: `Could not retrieve outstanding airdrops for account ${args.accountId}`,
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

 