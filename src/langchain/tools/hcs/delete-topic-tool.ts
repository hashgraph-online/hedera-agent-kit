import { z } from 'zod';
import { DeleteTopicParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { HcsBuilder } from '../../../builders/hcs/hcs-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const DeleteTopicZodSchemaCore = z.object({
  topicId: z
    .string()
    .describe('The ID of the topic to be deleted (e.g., "0.0.xxxx").'),
});

export class HederaDeleteTopicTool extends BaseHederaTransactionTool<
  typeof DeleteTopicZodSchemaCore
> {
  name = 'hedera-hcs-delete-topic';
  description = 'Deletes an HCS topic. Requires topicId.';
  specificInputSchema = DeleteTopicZodSchemaCore;
  namespace = 'hcs';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hcs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof DeleteTopicZodSchemaCore>
  ): Promise<void> {
    await (builder as HcsBuilder).deleteTopic(
      specificArgs as unknown as DeleteTopicParams
    );
  }
}
