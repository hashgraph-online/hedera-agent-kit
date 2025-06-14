import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';
import { HCS10Builder } from '../../../builders/hcs10/hcs10-builder';

export interface CheckMessagesToolParams extends BaseHederaQueryToolParams {}

/**
 * A tool to check for new messages on an active HCS-10 connection topic,
 * or optionally fetch the latest messages regardless of timestamp.
 */
const CheckMessagesZodSchema = z.object({
  targetIdentifier: z
    .string()
    .describe(
      "The account ID (e.g., 0.0.12345) of the target agent OR the connection number (e.g., '1', '2') from the 'list_connections' tool to check messages for."
    ),
  fetchLatest: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Set to true to fetch the latest messages even if they have been seen before, ignoring the last checked timestamp. Defaults to false (fetching only new messages).'
    ),
  lastMessagesCount: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'When fetchLatest is true, specifies how many of the most recent messages to retrieve. Defaults to 1.'
    ),
});

export class CheckMessagesTool extends BaseHederaQueryTool<
  typeof CheckMessagesZodSchema
> {
  name = 'check_messages';
  description = `Checks for and retrieves messages from an active connection.
Identify the target agent using their account ID (e.g., 0.0.12345) or the connection number shown in 'list_connections'.
By default, it only retrieves messages newer than the last check.
Use 'fetchLatest: true' to get the most recent messages regardless of when they arrived.
Use 'lastMessagesCount' to specify how many latest messages to retrieve (default 1 when fetchLatest is true).`;
  specificInputSchema = CheckMessagesZodSchema;
  namespace = 'hcs10';

  constructor(params: CheckMessagesToolParams) {
    super(params);
  }

  protected async executeQuery({
    targetIdentifier,
    fetchLatest,
    lastMessagesCount,
  }: z.infer<typeof CheckMessagesZodSchema>): Promise<unknown> {
    const hcs10Builder = this.hederaKit.hcs10() as HCS10Builder;
    await hcs10Builder.checkMessages({
      targetIdentifier,
      fetchLatest,
      lastMessagesCount: lastMessagesCount || 1,
    });

    const result = await hcs10Builder.execute();

    if (result.success && 'rawResult' in result && result.rawResult) {
      const raw = result.rawResult as {
        formattedOutput?: string;
        message?: string;
      };
      return {
        success: true,
        data: raw.formattedOutput || raw.message || 'Messages checked',
      };
    }

    return result;
  }
}
