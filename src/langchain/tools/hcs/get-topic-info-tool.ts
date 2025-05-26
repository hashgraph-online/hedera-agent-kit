import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetTopicInfoZodSchema = z.object({
  topicId: z
    .string()
    .describe('The topic ID to get information for (e.g., "0.0.12345")'),
});

/**
 * Tool for retrieving Hedera Consensus Service topic information.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetTopicInfoTool extends BaseHederaQueryTool<
  typeof GetTopicInfoZodSchema
> {
  name = 'hedera-get-topic-info';
  description =
    'Retrieves information about a Hedera Consensus Service topic including admin key, submit key, memo, and other metadata.';
  specificInputSchema = GetTopicInfoZodSchema;
  namespace = 'hcs';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetTopicInfoZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting topic info for topic ID: ${args.topicId}`);
    
    const topicInfo = await this.hederaKit.query().getTopicInfo(args.topicId);
    
    if (!topicInfo) {
      return {
        success: false,
        error: `Topic ${args.topicId} not found`,
      };
    }

    return {
      success: true,
      topicInfo,
    };
  }
} 
 