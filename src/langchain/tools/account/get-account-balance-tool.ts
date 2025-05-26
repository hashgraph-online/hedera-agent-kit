import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetAccountBalanceZodSchema = z.object({
  accountId: z
    .string()
    .describe('The account ID to get balance for (e.g., "0.0.12345")'),
});

/**
 * Tool for retrieving Hedera account HBAR balance.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetAccountBalanceTool extends BaseHederaQueryTool<
  typeof GetAccountBalanceZodSchema
> {
  name = 'hedera-get-account-balance';
  description =
    'Retrieves the HBAR balance for a Hedera account. Returns the balance in HBAR (not tinybars).';
  specificInputSchema = GetAccountBalanceZodSchema;
  namespace = 'account';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetAccountBalanceZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting balance for account ID: ${args.accountId}`);

    const balance = await this.hederaKit
      .query()
      .getAccountBalance(args.accountId);

    if (balance === null) {
      return {
        success: false,
        error: `Could not retrieve balance for account ${args.accountId}`,
      };
    }

    return {
      success: true,
      accountId: args.accountId,
      balance: balance,
      unit: 'HBAR',
    };
  }
}
