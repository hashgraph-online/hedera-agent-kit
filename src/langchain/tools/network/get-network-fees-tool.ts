import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetNetworkFeesZodSchema = z.object({
  timestamp: z
    .string()
    .optional()
    .describe('Optional timestamp for historical fees'),
});

/**
 * Tool for retrieving network fees.
 */
export class HederaGetNetworkFeesTool extends BaseHederaQueryTool<
  typeof GetNetworkFeesZodSchema
> {
  name = 'hedera-get-network-fees';
  description = 'Retrieves network fees from the Hedera network.';
  specificInputSchema = GetNetworkFeesZodSchema;
  namespace = 'network';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetNetworkFeesZodSchema>
  ): Promise<unknown> {
    this.logger.info('Getting network fees');

    const networkFees = await this.hederaKit
      .query()
      .getNetworkFees(args.timestamp);

    if (networkFees === null) {
      return {
        success: false,
        error: 'Could not retrieve network fees',
      };
    }

    return {
      success: true,
      networkFees,
    };
  }
}
