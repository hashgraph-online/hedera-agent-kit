import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';
import { HCS10Builder } from '../../../builders/hcs10/hcs10-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const ListUnapprovedConnectionRequestsZodSchema = z.object({});

export interface ListUnapprovedConnectionRequestsToolParams
  extends BaseHederaQueryToolParams {}

/**
 * Lists all connection requests that are not fully established
 */
export class ListUnapprovedConnectionRequestsTool extends BaseHederaQueryTool<
  typeof ListUnapprovedConnectionRequestsZodSchema
> {
  name = 'list_unapproved_connection_requests';
  description =
    'Lists all connection requests that are not fully established, including incoming requests needing approval and outgoing requests waiting for confirmation.';
  specificInputSchema = ListUnapprovedConnectionRequestsZodSchema;
  namespace = 'hcs10';

  constructor(params: ListUnapprovedConnectionRequestsToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hcs10();
  }

  protected async executeQuery(
    _: z.infer<typeof ListUnapprovedConnectionRequestsZodSchema>
  ): Promise<unknown> {
    const hcs10Builder = this.getServiceBuilder() as HCS10Builder;
    await hcs10Builder.listUnapprovedConnectionRequests();
    const result = await hcs10Builder.execute();
    return 'rawResult' in result ? result.rawResult : result;
  }
}
