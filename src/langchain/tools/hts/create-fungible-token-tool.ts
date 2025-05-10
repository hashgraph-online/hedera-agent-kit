import { z } from 'zod';
import { FTCreateParams } from '../../../types';
import { TokenSupplyType as SDKTokenSupplyType } from '@hashgraph/sdk';
import { BigNumber } from 'bignumber.js';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';
import { parseCustomFeesJson } from './hts-tool-utils';

const FTCreateZodSchemaCore = z.object({
  tokenName: z.string().describe('The publicly visible name of the token.'),
  tokenSymbol: z.string().describe('The publicly visible symbol of the token.'),
  treasuryAccountId: z
    .string()
    .describe('Treasury account ID (e.g., "0.0.xxxx").'),
  initialSupply: z
    .union([z.number(), z.string()])
    .describe(
      'Initial supply in the smallest denomination (number or string for large numbers).'
    ),
  decimals: z.number().int().describe('Number of decimal places.'),
  adminKey: z
    .string()
    .optional()
    .describe('Admin key (serialized string, or "current_signer").'),
  kycKey: z
    .string()
    .optional()
    .describe('KYC key (serialized string, or "current_signer").'),
  freezeKey: z
    .string()
    .optional()
    .describe('Freeze key (serialized string, or "current_signer").'),
  wipeKey: z
    .string()
    .optional()
    .describe('Wipe key (serialized string, or "current_signer").'),
  supplyKey: z
    .string()
    .optional()
    .describe('Supply key (serialized string, or "current_signer").'),
  feeScheduleKey: z
    .string()
    .optional()
    .describe('Fee schedule key (serialized string, or "current_signer").'),
  pauseKey: z
    .string()
    .optional()
    .describe('Pause key (serialized string, or "current_signer").'),
  autoRenewAccountId: z.string().optional().describe('Auto-renew account ID.'),
  autoRenewPeriod: z
    .number()
    .optional()
    .describe('Auto-renewal period in seconds.'),
  memo: z.string().optional().describe('Token memo.'),
  freezeDefault: z.boolean().optional().describe('Default freeze status.'),
  customFees: z
    .string()
    .optional()
    .describe(
      'Custom fees as a JSON string (array of CustomFee-like objects).'
    ),
  supplyType: z
    .enum([
      SDKTokenSupplyType.Finite.toString(),
      SDKTokenSupplyType.Infinite.toString(),
    ])
    .describe('Supply type: FINITE or INFINITE.'),
  maxSupply: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Max supply if supplyType is FINITE (number or string).'),
});

export class HederaCreateFungibleTokenTool extends BaseHederaTransactionTool<
  typeof FTCreateZodSchemaCore
> {
  name = 'hedera-hts-create-fungible-token';
  description =
    'Creates a new Hedera Fungible Token (FT). Provide token details. Use metaOptions for execution control.';
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
    const ftParams: FTCreateParams = {
      tokenName: specificArgs.tokenName,
      tokenSymbol: specificArgs.tokenSymbol,
      treasuryAccountId: specificArgs.treasuryAccountId,
      initialSupply:
        typeof specificArgs.initialSupply === 'string'
          ? new BigNumber(specificArgs.initialSupply)
          : specificArgs.initialSupply,
      decimals: specificArgs.decimals,
      supplyType:
        specificArgs.supplyType === SDKTokenSupplyType.Finite.toString()
          ? SDKTokenSupplyType.Finite
          : SDKTokenSupplyType.Infinite,
      customFees: specificArgs.customFees
        ? parseCustomFeesJson(specificArgs.customFees, this.logger)
        : undefined,
    };

    await (builder as HtsBuilder).createFungibleToken(ftParams);
  }
}
