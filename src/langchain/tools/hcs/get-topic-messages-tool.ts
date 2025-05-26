import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetTopicMessagesByFilterZodSchema = z.object({
  topicId: z
    .string()
    .describe('The topic ID to get messages for (e.g., "0.0.12345")'),
  sequenceNumber: z
    .string()
    .optional()
    .describe('Filter by sequence number (e.g., "gt:10", "lte:20")'),
  startTime: z
    .string()
    .optional()
    .describe('Filter by start consensus timestamp (e.g., "1629400000.000000000")'),
  endTime: z
    .string()
    .optional()
    .describe('Filter by end consensus timestamp (e.g., "1629500000.000000000")'),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum number of messages to return'),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Order of messages (ascending or descending)'),
});

/**
 * Tool for retrieving filtered messages from a Hedera Consensus Service topic.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetTopicMessages extends BaseHederaQueryTool<
  typeof GetTopicMessagesByFilterZodSchema
> {
  name = 'hedera-get-topic-messages-by-filter';
  description =
    'Retrieves filtered messages from a Hedera Consensus Service topic with optional filters for sequence number, time range, limit, and order.';
  specificInputSchema = GetTopicMessagesByFilterZodSchema;
  namespace = 'hcs';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetTopicMessagesByFilterZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting filtered messages for topic ID: ${args.topicId}`);
    
    const options: {
      sequenceNumber?: string;
      startTime?: string;
      endTime?: string;
      limit?: number;
      order?: 'asc' | 'desc';
    } = {};

    if (args.sequenceNumber) options.sequenceNumber = args.sequenceNumber;
    if (args.startTime) options.startTime = args.startTime;
    if (args.endTime) options.endTime = args.endTime;
    if (args.limit) options.limit = args.limit;
    if (args.order) options.order = args.order;

    const messages = await this.hederaKit.query().getTopicMessagesByFilter(
      args.topicId,
      options
    );
    
    if (!messages) {
      return {
        success: false,
        error: `Could not retrieve messages for topic ${args.topicId}`,
      };
    }

    return {
      success: true,
      topicId: args.topicId,
      messageCount: messages.length,
      filters: options,
      messages,
    };
  }
} 