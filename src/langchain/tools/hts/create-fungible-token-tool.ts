import { z } from 'zod';
import { FTCreateParams } from '../../../types';
import { TokenSupplyType as SDKTokenSupplyType } from '@hashgraph/sdk';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

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

const FractionalFeeInputSchema = z.object({
  type: z.literal('FRACTIONAL'),
  feeCollectorAccountId: z.string().describe("Fee collector's account ID."),
  numerator: z.number().int().describe('Numerator of the fractional fee.'),
  denominator: z
    .number()
    .int()
    .positive()
    .describe('Denominator of the fractional fee.'),
  minAmount: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Minimum fractional fee amount.'),
  maxAmount: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Maximum fractional fee amount (0 for no max).'),
  assessmentMethodInclusive: z
    .boolean()
    .optional()
    .describe('Fee is assessed on net amount (false) or gross (true).'),
});

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

const CustomFeeInputUnionSchema = z.discriminatedUnion('type', [
  FixedFeeInputSchema,
  FractionalFeeInputSchema,
  RoyaltyFeeInputSchema,
]);

const FTCreateZodSchemaCore = z.object({
  tokenName: z.string().describe('The publicly visible name of the token.'),
  tokenSymbol: z
    .string()
    .optional()
    .describe('The publicly visible symbol of the token.'),
  treasuryAccountId: z
    .string()
    .optional()
    .describe('Treasury account ID (e.g., "0.0.xxxx").'),
  initialSupply: z
    .union([z.number(), z.string()])
    .describe('Initial supply in the smallest denomination.'),
  decimals: z
    .number()
    .int()
    .optional()
    .default(0)
    .describe(
      'Number of decimal places for the token. Defaults to 0 if not specified.'
    ),
  adminKey: z
    .string()
    .optional()
    .describe(
      'Optional. Admin key (serialized string). Builder handles parsing.'
    ),
  kycKey: z
    .string()
    .optional()
    .describe(
      'Optional. KYC key (serialized string). Builder handles parsing.'
    ),
  freezeKey: z
    .string()
    .optional()
    .describe(
      'Optional. Freeze key (serialized string). Builder handles parsing.'
    ),
  wipeKey: z
    .string()
    .optional()
    .describe(
      'Optional. Wipe key (serialized string). Builder handles parsing.'
    ),
  supplyKey: z
    .string()
    .optional()
    .describe(
      'Optional. Supply key (serialized string). Builder handles parsing.'
    ),
  feeScheduleKey: z
    .string()
    .optional()
    .describe(
      'Optional. Fee schedule key (serialized string). Builder handles parsing.'
    ),
  pauseKey: z
    .string()
    .optional()
    .describe(
      'Optional. Pause key (serialized string). Builder handles parsing.'
    ),
  autoRenewAccountId: z
    .string()
    .optional()
    .describe('Optional. Auto-renew account ID (e.g., "0.0.xxxx").'),
  autoRenewPeriod: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional. Auto-renewal period in seconds.'),
  memo: z.string().optional().describe('Optional. Memo for the token.'),
  freezeDefault: z
    .boolean()
    .optional()
    .describe('Optional. Default freeze status for accounts.'),
  customFees: z
    .array(CustomFeeInputUnionSchema)
    .optional()
    .describe('Optional. Array of custom fee objects for the token.'),
  supplyType: z
    .enum([
      SDKTokenSupplyType.Finite.toString(),
      SDKTokenSupplyType.Infinite.toString(),
    ])
    .optional()
    .default(SDKTokenSupplyType.Finite.toString())
    .describe(
      'Supply type: FINITE or INFINITE. Defaults to FINITE if not specified.'
    ),
  maxSupply: z
    .union([z.number(), z.string()])
    .optional()
    .default(1000000000000000)
    .describe(
      'Max supply if supplyType is FINITE. Builder validates against initialSupply.'
    ),
});

export class HederaCreateFungibleTokenTool extends BaseHederaTransactionTool<
  typeof FTCreateZodSchemaCore
> {
  name = 'hedera-hts-create-fungible-token';
  description =
    'Creates a new Hedera Fungible Token (FT). Builder handles key parsing, fee construction, and supply validation.';
  specificInputSchema = FTCreateZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof FTCreateZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).createFungibleToken(
      specificArgs as unknown as FTCreateParams
    );
  }
}
