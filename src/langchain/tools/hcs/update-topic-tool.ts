import { z } from 'zod';
import { UpdateTopicParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { HcsBuilder } from '../../../builders/hcs/hcs-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const UpdateTopicZodSchemaCore = z.object({
  topicId: z
    .string()
    .describe('The ID of the topic to update (e.g., "0.0.xxxx").'),
  memo: z
    .string()
    .nullable()
    .optional()
    .describe('Optional. New memo for the topic. Pass null to clear.'),
  adminKey: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Optional. New admin key (serialized string). Pass null to clear.'
    ),
  submitKey: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Optional. New submit key (serialized string). Pass null to clear.'
    ),
  autoRenewPeriod: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional. New auto-renewal period in seconds.'),
  autoRenewAccountId: z
    .string()
    .nullable()
    .optional()
    .describe('Optional. New auto-renew account ID. Pass null to clear.'),
  feeScheduleKey: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Optional. New fee schedule key (serialized string). Pass null to clear.'
    ),
  exemptAccountIds: z
    .array(z.string())
    .optional()
    .describe(
      'Optional. New list of exempt account IDs. An empty array clears all exemptions.'
    ),
});

export class HederaUpdateTopicTool extends BaseHederaTransactionTool<
  typeof UpdateTopicZodSchemaCore
> {
  name = 'hedera-hcs-update-topic';
  description =
    'Updates an HCS topic. Requires topicId. Other fields are optional. Null can be used to clear certain fields.';
  specificInputSchema = UpdateTopicZodSchemaCore;
  namespace = 'hcs';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hcs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof UpdateTopicZodSchemaCore>
  ): Promise<void> {
    await (builder as HcsBuilder).updateTopic(
      specificArgs as unknown as UpdateTopicParams
    );
  }
}
