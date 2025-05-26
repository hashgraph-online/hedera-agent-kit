import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetContractsZodSchema = z.object({
  contractId: z.string().optional().describe('Filter by specific contract ID'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of contracts to return'),
  order: z.enum(['asc', 'desc']).optional().describe('Order of results'),
});

/**
 * Tool for retrieving contract entities from the network.
 */
export class HederaGetContractsTool extends BaseHederaQueryTool<
  typeof GetContractsZodSchema
> {
  name = 'hedera-get-contracts';
  description =
    'Retrieves contract entities from the Hedera network with optional filtering.';
  specificInputSchema = GetContractsZodSchema;
  namespace = 'scs';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetContractsZodSchema>
  ): Promise<unknown> {
    this.logger.info('Getting contracts from the network');

    const contracts = await this.hederaKit.query().getContracts(args);

    if (contracts === null) {
      return {
        success: false,
        error: 'Could not retrieve contracts from the network',
      };
    }

    return {
      success: true,
      contracts,
      count: contracts.length,
    };
  }
}
