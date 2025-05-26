import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetNetworkInfoZodSchema = z.object({});

/**
 * Tool for retrieving network information.
 */
export class HederaGetNetworkInfoTool extends BaseHederaQueryTool<
  typeof GetNetworkInfoZodSchema
> {
  name = 'hedera-get-network-info';
  description = 'Retrieves network information from the Hedera network.';
  specificInputSchema = GetNetworkInfoZodSchema;
  namespace = 'network';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(): Promise<unknown> {
    this.logger.info('Getting network information');

    const networkInfo = await this.hederaKit.query().getNetworkInfo();

    if (networkInfo === null) {
      return {
        success: false,
        error: 'Could not retrieve network information',
      };
    }

    return {
      success: true,
      networkInfo,
    };
  }
}
