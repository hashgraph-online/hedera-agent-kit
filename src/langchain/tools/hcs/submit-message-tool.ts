import { z } from 'zod';
import { SubmitMessageParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { HcsBuilder } from '../../../builders/hcs/hcs-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const SubmitMessageZodSchemaCore = z.object({
  topicId: z
    .string()
    .describe(
      'The ID of the topic to submit the message to (e.g., "0.0.xxxx").'
    ),
  message: z
    .string()
    .describe(
      'The message content. For binary, provide as base64 string; tool will decode.'
    ),
});

export class HederaSubmitMessageTool extends BaseHederaTransactionTool<
  typeof SubmitMessageZodSchemaCore
> {
  name = 'hedera-hcs-submit-message';
  description =
    'Submits a message to a Hedera Consensus Service (HCS) topic. Provide topicId and message. Use metaOptions for execution control.';
  specificInputSchema = SubmitMessageZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hcs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof SubmitMessageZodSchemaCore>
  ): Promise<void> {
    let messageContent: string | Uint8Array = specificArgs.message;

    const submitParams: SubmitMessageParams = {
      topicId: specificArgs.topicId,
      message: messageContent,
    };
    (builder as HcsBuilder).submitMessageToTopic(submitParams);
  }
}
