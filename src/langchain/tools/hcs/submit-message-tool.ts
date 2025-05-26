import { z } from 'zod';
import { SubmitMessageParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { HcsBuilder } from '../../../builders/hcs/hcs-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const SubmitMessageZodSchemaCore = z.object({
  topicId: z.string().describe('The ID of the topic (e.g., "0.0.xxxx").'),
  message: z
    .string()
    .describe(
      'The message content. For binary data, provide as a base64 encoded string; the builder handles decoding.'
    ),
  maxChunks: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional. Maximum number of chunks for messages exceeding single transaction limits. Builder handles chunking.'
    ),
  chunkSize: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional. Size of each chunk in bytes if chunking is performed. Builder applies default if needed.'
    ),
  submitKey: z
    .string()
    .optional()
    .describe(
      'Optional. Submit key if required by the topic and different from the operator (e.g., serialized public key string, or private key string for derivation by builder).'
    ),
});

export class HederaSubmitMessageTool extends BaseHederaTransactionTool<
  typeof SubmitMessageZodSchemaCore
> {
  name = 'hedera-hcs-submit-message';
  description =
    'Submits a message to a Hedera Consensus Service (HCS) topic. The builder handles chunking and base64 decoding for binary messages.';
  specificInputSchema = SubmitMessageZodSchemaCore;
  namespace = 'hcs';

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
    await (builder as HcsBuilder).submitMessageToTopic(
      specificArgs as unknown as SubmitMessageParams
    );
  }
}
