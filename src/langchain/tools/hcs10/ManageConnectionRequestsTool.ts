import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';
import { HCS10Builder } from '../../../builders/hcs10/hcs10-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const ManageConnectionRequestsZodSchema = z.object({
  action: z
    .enum(['list', 'view', 'reject'])
    .describe(
      'The action to perform: list all requests, view details of a specific request, or reject a request'
    ),
  requestKey: z
    .string()
    .optional()
    .describe(
      'The unique request key to view or reject (required for view and reject actions)'
    ),
});

export interface ManageConnectionRequestsToolParams
  extends BaseHederaQueryToolParams {}

/**
 * A tool for managing incoming connection requests in a LangChain-compatible way.
 * This tool allows an agent to list, view details of, and reject incoming connection requests.
 */
export class ManageConnectionRequestsTool extends BaseHederaQueryTool<
  typeof ManageConnectionRequestsZodSchema
> {
  name = 'manage_connection_requests';
  description =
    'Manage incoming connection requests. List pending requests, view details about requesting agents, and reject connection requests. Use the separate "accept_connection_request" tool to accept.';
  specificInputSchema = ManageConnectionRequestsZodSchema;
  namespace = 'hcs10';

  constructor(params: ManageConnectionRequestsToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hcs10();
  }

  protected async executeQuery({
    action,
    requestKey,
  }: z.infer<typeof ManageConnectionRequestsZodSchema>): Promise<unknown> {
    const hcs10Builder = this.getServiceBuilder() as HCS10Builder;
    const params: { action: 'list' | 'view' | 'reject'; requestKey?: string } =
      { action };
    if (requestKey !== undefined) {
      params.requestKey = requestKey;
    }
    await hcs10Builder.manageConnectionRequests(params);
    const result = await hcs10Builder.execute();
    return 'rawResult' in result ? result.rawResult : result;
  }
}
