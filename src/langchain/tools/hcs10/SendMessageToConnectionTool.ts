import { z } from 'zod';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HCS10Builder } from '../../../builders/hcs10/hcs10-builder';

const SendMessageToConnectionZodSchema = z.object({
  targetIdentifier: z
    .string()
    .describe(
      "The request key (e.g., 'req-1:0.0.6155171@0.0.6154875'), account ID (e.g., 0.0.12345) of the target agent, OR the connection number (e.g., '1', '2') from the 'list_connections' tool. Request key is most deterministic."
    ),
  message: z.string().describe('The text message content to send.'),
  disableMonitoring: z.boolean().optional().default(false),
});

export interface SendMessageToConnectionToolParams
  extends BaseHederaTransactionToolParams {}

/**
 * A tool to send a message to an agent over an established HCS-10 connection.
 */
export class SendMessageToConnectionTool extends BaseHederaTransactionTool<
  typeof SendMessageToConnectionZodSchema
> {
  name = 'send_message_to_connection';
  description =
    "Sends a text message to another agent using an existing active connection. Identify the target agent using their account ID (e.g., 0.0.12345) or the connection number shown in 'list_connections'. Return back the reply from the target agent if possible";
  specificInputSchema = SendMessageToConnectionZodSchema;
  namespace = 'hcs10';

  constructor(params: SendMessageToConnectionToolParams) {
    super(params);
    this.requiresMultipleTransactions = true;
    this.neverScheduleThisTool = true;
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hcs10();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof SendMessageToConnectionZodSchema>
  ): Promise<void> {
    const hcs10Builder = builder as HCS10Builder;

    await hcs10Builder.sendMessageToConnection({
      targetIdentifier: specificArgs.targetIdentifier,
      message: specificArgs.message,
      disableMonitoring: specificArgs.disableMonitoring,
    });
  }
}
