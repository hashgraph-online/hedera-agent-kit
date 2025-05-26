import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetHbarPriceZodSchema = z.object({
  date: z
    .string()
    .optional()
    .describe(
      'Date to get HBAR price for in ISO format (e.g., "2023-12-01T00:00:00Z"). Defaults to current date.'
    ),
});

/**
 * Tool for retrieving HBAR price from the Hedera network.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetHbarPriceTool extends BaseHederaQueryTool<
  typeof GetHbarPriceZodSchema
> {
  name = 'hedera-get-hbar-price';
  description =
    'Retrieves the HBAR price in USD for a specific date. Defaults to current date if no date provided.';
  specificInputSchema = GetHbarPriceZodSchema;
  namespace = 'network';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetHbarPriceZodSchema>
  ): Promise<unknown> {
    const date = args.date ? new Date(args.date) : new Date();

    this.logger.info(`Getting HBAR price for date: ${date.toISOString()}`);

    const price = await this.hederaKit.query().getHbarPrice(date);

    if (price === null) {
      return {
        success: false,
        error: `Could not retrieve HBAR price for date ${date.toISOString()}`,
      };
    }

    return {
      success: true,
      date: date.toISOString(),
      priceUsd: price,
      currency: 'USD',
    };
  }
}
