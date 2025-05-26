import { z } from 'zod';
import { NFTCreateParams } from '../../../types';
import { TokenSupplyType as SDKTokenSupplyType } from '@hashgraph/sdk';
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
  type: z.enum(['FIXED', 'FIXED_FEE']),
  feeCollectorAccountId: z.string().optional().describe("Fee collector's account ID. Defaults to user's account if in user-centric context and not specified."),
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
  type: z.enum(['FRACTIONAL', 'FRACTIONAL_FEE']),
  feeCollectorAccountId: z.string().optional().describe("Fee collector's account ID. Defaults to user's account if in user-centric context and not specified."),
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

/**
 * Zod schema for a royalty fee input object.
 */
const RoyaltyFeeInputSchema = z.object({
  type: z.enum(['ROYALTY', 'ROYALTY_FEE']),
  feeCollectorAccountId: z.string().optional().describe("Fee collector's account ID. Defaults to user's account if in user-centric context and not specified."),
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

const NFTCreateZodSchemaCore = z.object({
  tokenName: z
    .string()
    .describe('The publicly visible name of the NFT collection.'),
  tokenSymbol: z
    .string()
    .optional()
    .describe('The publicly visible symbol of the NFT collection.'),
  treasuryAccountId: z
    .string()
    .optional()
    .describe('Treasury account ID (e.g., "0.0.xxxx").'),
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
  memo: z
    .string()
    .optional()
    .describe('Optional. Memo for the NFT collection.'),
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
      'Supply type: FINITE or INFINITE. NFTs typically use FINITE. Defaults to FINITE if not specified.'
    ),
  maxSupply: z
    .union([z.number(), z.string()])
    .optional()
    .describe(
      'Max supply if supplyType is FINITE. Builder handles validation.'
    ),
});

export class HederaCreateNftTool extends BaseHederaTransactionTool<
  typeof NFTCreateZodSchemaCore
> {
  name = 'hedera-hts-create-nft';
  description =
    'Creates a new Hedera Non-Fungible Token (NFT) collection. Builder handles key parsing, fee construction, and supply validation.';
  specificInputSchema = NFTCreateZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof NFTCreateZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).createNonFungibleToken(
      specificArgs as unknown as NFTCreateParams
    );
  }

  protected override getNoteForKey(key: string, schemaDefaultValue: unknown, actualValue: unknown): string | undefined {
    if (key === 'supplyType') {
      return `Your NFT collection's supply type was set to '${actualValue}' by default.`;
    }
    if (key === 'maxSupply' && actualValue !== undefined) {
      try {
        const num = BigInt(String(actualValue));
        return `A maximum supply of '${num.toLocaleString()}' for the NFT collection was set (tool schema default).`;
      } catch {
        return `The maximum supply for the NFT collection was set to '${actualValue}' (tool schema default).`;
      }
    }
    return undefined;
  }
}
