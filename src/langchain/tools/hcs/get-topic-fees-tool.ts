import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetTopicFeesZodSchema = z.object({
  topicId: z
    .string()
    .describe('The topic ID to get custom fees for (e.g., "0.0.12345")'),
});

/**
 * Tool for retrieving custom fees for a Hedera Consensus Service topic.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetTopicFeesTool extends BaseHederaQueryTool<
  typeof GetTopicFeesZodSchema
> {
  name = 'hedera-get-topic-fees';
  description =
    'Retrieves custom fees associated with a Hedera Consensus Service topic.';
  specificInputSchema = GetTopicFeesZodSchema;
  namespace = 'hcs';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetTopicFeesZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting custom fees for topic ID: ${args.topicId}`);
    
    const fees = await this.hederaKit.query().getTopicFees(args.topicId);
    
    if (!fees) {
      return {
        success: true,
        topicId: args.topicId,
        customFees: null,
        message: 'No custom fees found for this topic',
      };
    }

    return {
      success: true,
      topicId: args.topicId,
      customFees: fees,
    };
  }
} 
 