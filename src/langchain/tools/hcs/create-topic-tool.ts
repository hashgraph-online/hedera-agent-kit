import { z } from 'zod';
import { CreateTopicParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { HcsBuilder } from '../../../builders/hcs/hcs-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

/**
 * Zod schema for the input structure of a single custom fee object.
 * This defines the structure the LLM should provide for each custom fee.
 */
const CustomFeeObjectSchema = z.object({
  feeCollectorAccountId: z
    .string()
    .describe('The account ID to receive the custom fee.'),
  denominatingTokenId: z
    .string()
    .optional()
    .describe('The token ID for fee denomination (if not HBAR).'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'The fee amount (smallest unit for tokens, or tinybars for HBAR).'
    ),
});

const CreateTopicZodSchemaCore = z.object({
  memo: z.string().optional().describe('Optional. Memo for the topic.'),
  adminKey: z
    .string()
    .optional()
    .describe(
      'Optional. Admin key for the topic (e.g., serialized public key string, or private key string for derivation by builder).'
    ),
  submitKey: z
    .string()
    .optional()
    .describe(
      'Optional. Submit key for the topic (e.g., serialized public key string, or private key string for derivation by builder).'
    ),
  autoRenewPeriod: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional. Auto-renewal period in seconds (e.g., 7776000 for 90 days).'
    ),
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
      'Optional. Fee schedule key for the topic (e.g., serialized public key string, or private key string for derivation by builder).'
    ),
  customFees: z
    .array(CustomFeeObjectSchema)
    .optional()
    .describe(
      'Optional. Array of custom fee objects to be applied to the topic.'
    ),
  exemptAccountIds: z
    .array(z.string())
    .optional()
    .describe('Optional. Account IDs exempt from custom fees.'),
});

export class HederaCreateTopicTool extends BaseHederaTransactionTool<
  typeof CreateTopicZodSchemaCore
> {
  name = 'hedera-hcs-create-topic';
  description =
    'Creates a new Hedera Consensus Service (HCS) topic. Provide parameters as needed. The builder handles defaults and key parsing.';
  specificInputSchema = CreateTopicZodSchemaCore;
  namespace = 'hcs';

  /**
   *  Topic Creation cannot be scheduled yet.
   */
  protected override neverScheduleThisTool = true;

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
    await (builder as HcsBuilder).createTopic(
      specificArgs as unknown as CreateTopicParams
    );
  }
}
