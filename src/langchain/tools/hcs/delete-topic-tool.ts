import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { DeleteTopicParams } from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { TopicId } from '@hashgraph/sdk'; 
import { 
    BaseHederaTransactionTool, 
    BaseHederaTransactionToolParams, 
} from '../common/base-hedera-transaction-tool';
import { HcsBuilder } from '../../../builders/hcs/hcs-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const DeleteTopicZodSchemaCore = z.object({
  topicId: z.string().describe('The ID of the topic to be deleted (e.g., \"0.0.xxxx\").'),
});

export class HederaDeleteTopicTool extends BaseHederaTransactionTool<typeof DeleteTopicZodSchemaCore> {
  name = 'hedera-hcs-delete-topic';
  description = 'Deletes an HCS topic. Requires topicId. Use metaOptions for execution control.';
  specificInputSchema = DeleteTopicZodSchemaCore;

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
    (builder as HcsBuilder).deleteTopic({ topicId: specificArgs.topicId });
  }
} 