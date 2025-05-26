import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetAccountInfoZodSchema = z.object({
  accountId: z
    .string()
    .describe('The account ID to get information for (e.g., "0.0.12345")'),
});

/**
 * Tool for retrieving full Hedera account information.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetAccountInfoTool extends BaseHederaQueryTool<
  typeof GetAccountInfoZodSchema
> {
  name = 'hedera-get-account-info';
  description =
    'Retrieves comprehensive information about a Hedera account including balance, key, memo, and other metadata.';
  specificInputSchema = GetAccountInfoZodSchema;
  namespace = 'account';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetAccountInfoZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting account info for account ID: ${args.accountId}`);

    const accountInfo = await this.hederaKit
      .query()
      .getAccountInfo(args.accountId);

    if (!accountInfo) {
      return {
        success: false,
        error: `Account ${args.accountId} not found`,
      };
    }

    return {
      success: true,
      accountInfo,
    };
  }
}
