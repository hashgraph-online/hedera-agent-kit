import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { CreateTopicParams, Key } from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { CustomFixedFee, Hbar, AccountId, TokenId } from '@hashgraph/sdk';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { HcsBuilder } from '../../../builders/hcs/hcs-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const CreateTopicZodSchemaCore = z.object({
  memo: z
    .string()
    .optional()
    .describe('Optional. The publicly visible memo for the topic.'),
  adminKey: z
    .string()
    .optional()
    .describe(
      'Optional. Admin key as a hex-encoded private key string or a serialized public key string.'
    ),
  submitKey: z
    .string()
    .optional()
    .describe(
      'Optional. Submit key as a hex-encoded private key string or a serialized public key string.'
    ),
  autoRenewPeriod: z
    .number()
    .optional()
    .describe('Optional. Auto-renewal period in seconds.'),
  autoRenewAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. Account ID for auto-renewal payments (e.g., "0.0.xxxx").'
    ),
  feeScheduleKey: z
    .string()
    .optional()
    .describe(
      'Optional. Fee schedule key as a hex-encoded private key string or a serialized public key string.'
    ),
  customFees: z
    .string()
    .optional()
    .describe(
      'Optional. Custom fees as a JSON string array of CustomFixedFee-like objects.'
    ),
  exemptAccountIds: z
    .array(z.string())
    .optional()
    .describe('Optional. Account IDs exempt from custom fees.'),
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Zod schema compatibility issue
export class HederaCreateTopicTool extends BaseHederaTransactionTool<
  typeof CreateTopicZodSchemaCore
> {
  name = 'hedera-hcs-create-topic';
  description =
    'Creates a new Hedera Consensus Service (HCS) topic. All parameters are optional. Use metaOptions for execution control.';
  specificInputSchema = CreateTopicZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hcs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof CreateTopicZodSchemaCore>
  ): Promise<void> {
    const topicParams: CreateTopicParams = {};
    if (specificArgs.memo ) topicParams.memo = specificArgs.memo;
    if (specificArgs.adminKey )
      topicParams.adminKey = specificArgs.adminKey;
    if (specificArgs.submitKey )
      topicParams.submitKey = specificArgs.submitKey;
    if (specificArgs.autoRenewPeriod )
      topicParams.autoRenewPeriod = specificArgs.autoRenewPeriod;
    if (specificArgs.autoRenewAccountId )
      topicParams.autoRenewAccountId = specificArgs.autoRenewAccountId;
    if (specificArgs.feeScheduleKey )
      topicParams.feeScheduleKey = specificArgs.feeScheduleKey;
    if (specificArgs.exemptAccountIds )
      topicParams.exemptAccountIds = specificArgs.exemptAccountIds;

    if (specificArgs.customFees ) {
      try {
        const parsedFees = JSON.parse(specificArgs.customFees) as any[];
        if (Array.isArray(parsedFees)) {
          topicParams.customFees = parsedFees.map((feeData) => {
            const fee = new CustomFixedFee().setFeeCollectorAccountId(
              feeData.feeCollectorAccountId
            );
            if (feeData.denominatingTokenId) {
              fee.setDenominatingTokenId(
                TokenId.fromString(feeData.denominatingTokenId)
              );
              if (feeData.amount ) fee.setAmount(feeData.amount);
            } else if (feeData.amount ) {
              fee.setHbarAmount(Hbar.fromTinybars(feeData.amount));
            }
            return fee;
          });
        }
      } catch (e) {
        this.logger.warn(
          'Failed to parse customFees JSON string for CreateTopic, skipping.',
          e
        );
      }
    }
    await (builder as HcsBuilder).createTopic(topicParams);
  }
}
