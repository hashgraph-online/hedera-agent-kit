import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { UpdateTopicParams, Key } from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { AccountId, PrivateKey, TopicId } from '@hashgraph/sdk';
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
    .optional()
    .describe('Optional. New memo. Send "null" or empty string to clear.'),
  adminKey: z
    .string()
    .optional()
    .describe(
      'Optional. New admin key (serialized string, or "null" to clear).'
    ),
  submitKey: z
    .string()
    .optional()
    .describe(
      'Optional. New submit key (serialized string, or "null" to clear).'
    ),
  autoRenewPeriod: z
    .number()
    .optional()
    .describe('Optional. New auto-renewal period in seconds.'),
  autoRenewAccountId: z
    .string()
    .optional()
    .describe('Optional. New auto-renew account ID, or "null" to clear.'),
  feeScheduleKey: z
    .string()
    .optional()
    .describe(
      'Optional. New fee schedule key (serialized string, or "null" to clear).'
    ),
  exemptAccountIds: z
    .array(z.string())
    .optional()
    .describe(
      'Optional. New list of exempt account IDs. Empty array to clear.'
    ),
});

export class HederaUpdateTopicTool extends BaseHederaTransactionTool<
  typeof UpdateTopicZodSchemaCore
> {
  name = 'hedera-hcs-update-topic';
  description =
    'Updates an HCS topic. Requires topicId and fields to update. Use metaOptions for execution control.';
  specificInputSchema = UpdateTopicZodSchemaCore;

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
    const updateParams: UpdateTopicParams = { topicId: specificArgs.topicId };
    const valOrNull = (val: string | undefined): string | null | undefined => {
      if (val === undefined) {
        return undefined;
      }
      if (val === 'null' || val === '') {
        return null;
      }
      return val;
    };
    const keyOrNull = (
      val: string | undefined
    ): string | Key | null | undefined => {
      if (val === undefined) {
        return undefined;
      }
      if (val === 'null') {
        return null;
      }
      return val;
    };
    let processedVal;
    if (specificArgs.memo) {
      processedVal = valOrNull(specificArgs.memo);
      if (processedVal) {
        updateParams.memo = processedVal;
      }
    }
    if (specificArgs.adminKey) {
      processedVal = keyOrNull(specificArgs.adminKey);
      if (processedVal) {
        updateParams.adminKey = processedVal;
      }
    }
    if (specificArgs.submitKey) {
      processedVal = keyOrNull(specificArgs.submitKey);
      if (processedVal) {
        updateParams.submitKey = processedVal;
      }
    }
    if (specificArgs.autoRenewPeriod) {
      updateParams.autoRenewPeriod = specificArgs.autoRenewPeriod;
    }
    if (specificArgs.autoRenewAccountId) {
      processedVal = valOrNull(specificArgs.autoRenewAccountId);
      if (processedVal) {
        updateParams.autoRenewAccountId = processedVal as
          | string
          | AccountId
          | null;
      }
    }
    if (specificArgs.feeScheduleKey) {
      processedVal = keyOrNull(specificArgs.feeScheduleKey);
      if (processedVal) {
        updateParams.feeScheduleKey = processedVal;
      }
    }
    if (specificArgs.exemptAccountIds) {
      updateParams.exemptAccountIds = specificArgs.exemptAccountIds;
    }
    await (builder as HcsBuilder).updateTopic(updateParams);
  }
}
