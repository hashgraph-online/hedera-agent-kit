import { z } from 'zod';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HCS10Builder } from '../../../builders/hcs10/hcs10-builder';

const AcceptConnectionRequestZodSchema = z.object({
  requestKey: z
    .string()
    .describe(
      'The unique request key of the specific request to accept. Use the "manage_connection_requests" tool with action="list" first to get valid keys.'
    ),
  hbarFee: z
    .number()
    .optional()
    .describe(
      'Optional HBAR fee amount to charge the connecting agent per message on the new connection topic.'
    ),
  exemptAccountIds: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of account IDs to exempt from any configured fees on the new connection topic.'
    ),
});

export interface AcceptConnectionRequestToolParams
  extends BaseHederaTransactionToolParams {}

/**
 * Tool for accepting incoming HCS-10 connection requests
 */
export class AcceptConnectionRequestTool extends BaseHederaTransactionTool<
  typeof AcceptConnectionRequestZodSchema
> {
  name = 'accept_connection_request';
  description =
    'Accepts a pending HCS-10 connection request from another agent. Use list_unapproved_connection_requests to see pending requests.';
  specificInputSchema = AcceptConnectionRequestZodSchema;
  namespace = 'hcs10';

  constructor({ ...rest }: AcceptConnectionRequestToolParams) {
    super(rest);
    this.neverScheduleThisTool = true;
    this.requiresMultipleTransactions = true;
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hcs10();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof AcceptConnectionRequestZodSchema>
  ): Promise<void> {
    const hcs10Builder = builder as HCS10Builder;

    await hcs10Builder.acceptConnection({
      requestKey: specificArgs.requestKey,
      hbarFee: specificArgs.hbarFee,
      exemptAccountIds: specificArgs.exemptAccountIds,
    });
  }
}
