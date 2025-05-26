import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetBlocksZodSchema = z.object({
  blockNumber: z
    .string()
    .optional()
    .describe('Filter by block number'),
  timestamp: z
    .string()
    .optional()
    .describe('Filter by timestamp'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of blocks to return'),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Order of results'),
});

/**
 * Tool for retrieving blocks from the network.
 */
export class HederaGetBlocksTool extends BaseHederaQueryTool<
  typeof GetBlocksZodSchema
> {
  name = 'hedera-get-blocks';
  description = 'Retrieves blocks from the Hedera network with optional filtering.';
  specificInputSchema = GetBlocksZodSchema;
  namespace = 'network';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetBlocksZodSchema>
  ): Promise<unknown> {
    this.logger.info('Getting blocks from the network');

    const blocks = await this.hederaKit.query().getBlocks(args);

    if (blocks === null) {
      return {
        success: false,
        error: 'Could not retrieve blocks from the network',
      };
    }

    return {
      success: true,
      blocks,
      count: blocks.length,
    };
  }
} 
 