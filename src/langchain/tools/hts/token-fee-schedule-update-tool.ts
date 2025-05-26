import { z } from 'zod';
import { TokenFeeScheduleUpdateParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

/**
 * Zod schema for a fixed fee input object.
 */
const FixedFeeInputSchema = z.object({
  type: z.literal('FIXED'),
  feeCollectorAccountId: z.string().describe("Fee collector's account ID."),
  denominatingTokenId: z
    .string()
    .optional()
    .describe('Denominating token ID for the fee (if not HBAR).'),
  amount: z
    .union([z.number(), z.string()])
    .describe('Fee amount (smallest unit for tokens, or tinybars for HBAR).'),
});

/**
 * Zod schema for a fractional fee input object.
 */
const FractionalFeeInputSchema = z.object({
  type: z.literal('FRACTIONAL'),
  feeCollectorAccountId: z.string().describe("Fee collector's account ID."),
  numerator: z.number().int().describe('Numerator of the fractional fee.'),
  denominator: z
    .number()
    .int()
    .positive()
    .describe('Denominator of the fractional fee.'),
  assessmentMethodInclusive: z
    .boolean()
    .optional()
    .describe('Fee is assessed on net amount (false) or gross (true).'),
});

/**
 * Zod schema for a royalty fee input object.
 */
const RoyaltyFeeInputSchema = z.object({
  type: z.literal('ROYALTY'),
  feeCollectorAccountId: z.string().describe("Fee collector's account ID."),
  numerator: z.number().int().describe('Numerator of the royalty fee.'),
  denominator: z
    .number()
    .int()
    .positive()
    .describe('Denominator of the royalty fee.'),
  fallbackFee: FixedFeeInputSchema.omit({ type: true })
    .optional()
    .describe('Fallback fixed fee if royalty is not applicable.'),
});

/**
 * Zod schema for a discriminated union of custom fee input types.
 */
const CustomFeeInputUnionSchema = z.discriminatedUnion('type', [
  FixedFeeInputSchema,
  FractionalFeeInputSchema,
  RoyaltyFeeInputSchema,
]);

const TokenFeeScheduleUpdateZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe(
      'The ID of the token whose fee schedule is to be updated (e.g., "0.0.xxxx").'
    ),
  customFees: z
    .array(CustomFeeInputUnionSchema)
    .min(1)
    .describe(
      'An array of new custom fee objects. This will replace the existing fee schedule.'
    ),
});

export class HederaTokenFeeScheduleUpdateTool extends BaseHederaTransactionTool<
  typeof TokenFeeScheduleUpdateZodSchemaCore
> {
  name = 'hedera-hts-token-fee-schedule-update';
  description =
    'Updates the fee schedule of a token. Requires tokenId and an array of custom fee objects.';
  specificInputSchema = TokenFeeScheduleUpdateZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof TokenFeeScheduleUpdateZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).feeScheduleUpdate(
      specificArgs as unknown as TokenFeeScheduleUpdateParams
    );
  }
}
