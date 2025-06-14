import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';
import { HCS10Builder } from '../../../builders/hcs10/hcs10-builder';

export interface ListConnectionsToolParams extends BaseHederaQueryToolParams {}

/**
 * A tool to list currently active HCS-10 connections stored in the state manager.
 * Enhanced to show more details similar to moonscape's implementation.
 */
const ListConnectionsZodSchema = z.object({
  includeDetails: z
    .boolean()
    .optional()
    .describe(
      'Whether to include detailed information about each connection'
    ),
  showPending: z
    .boolean()
    .optional()
    .describe('Whether to include pending connection requests'),
});

export class ListConnectionsTool extends BaseHederaQueryTool<
  typeof ListConnectionsZodSchema
> {
  name = 'list_connections';
  description =
    'Lists the currently active HCS-10 connections with detailed information. Shows connection status, agent details, and recent activity. Use this to get a comprehensive view of all active connections.';
  specificInputSchema = ListConnectionsZodSchema;
  namespace = 'hcs10';

  constructor(params: ListConnectionsToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof ListConnectionsZodSchema>
  ): Promise<unknown> {
    const hcs10Builder = this.hederaKit.hcs10() as HCS10Builder;
    const params: { includeDetails?: boolean; showPending?: boolean } = {};
    if (args.includeDetails !== undefined) {
      params.includeDetails = args.includeDetails;
    }
    if (args.showPending !== undefined) {
      params.showPending = args.showPending;
    }
    await hcs10Builder.listConnections(params);
    
    const result = await hcs10Builder.execute();
    
    if (result.success && 'rawResult' in result && result.rawResult) {
      const raw = result.rawResult as { formattedOutput?: string; message?: string };
      return {
        success: true,
        data: raw.formattedOutput || raw.message || 'Connections listed'
      };
    }
    
    return result;
  }
}
