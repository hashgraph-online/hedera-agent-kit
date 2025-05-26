import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetTransactionZodSchema = z.object({
  transactionIdOrHash: z
    .string()
    .describe(
      'The transaction ID (e.g., "0.0.12345-1234567890-123456789") or hash to get details for'
    ),
});

/**
 * Tool for retrieving Hedera transaction details.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetTransactionTool extends BaseHederaQueryTool<
  typeof GetTransactionZodSchema
> {
  name = 'hedera-get-transaction';
  description =
    'Retrieves detailed information about a Hedera transaction by transaction ID or hash.';
  specificInputSchema = GetTransactionZodSchema;
  namespace = 'transaction';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetTransactionZodSchema>
  ): Promise<unknown> {
    this.logger.info(
      `Getting transaction details for: ${args.transactionIdOrHash}`
    );

    const transaction = await this.hederaKit
      .query()
      .getTransaction(args.transactionIdOrHash);

    if (!transaction) {
      return {
        success: false,
        error: `Transaction ${args.transactionIdOrHash} not found`,
      };
    }

    return {
      success: true,
      transactionIdOrHash: args.transactionIdOrHash,
      transaction,
    };
  }
}
