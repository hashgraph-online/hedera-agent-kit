import { z } from 'zod';
import { NFTCreateParams } from '../../../types';
import { TokenSupplyType as SDKTokenSupplyType } from '@hashgraph/sdk';
import { BigNumber } from 'bignumber.js';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';
import { parseCustomFeesJson } from './hts-tool-utils';

const NFTCreateZodSchemaCore = z.object({
  tokenName: z.string().describe('The publicly visible name of the NFT.'),
  tokenSymbol: z.string().describe('The publicly visible symbol of the NFT.'),
  treasuryAccountId: z
    .string()
    .describe('Treasury account ID (e.g., "0.0.xxxx").'),
  adminKey: z.string().optional().describe('Admin key (serialized string).'),
  kycKey: z.string().optional().describe('KYC key (serialized string).'),
  freezeKey: z.string().optional().describe('Freeze key (serialized string).'),
  wipeKey: z.string().optional().describe('Wipe key (serialized string).'),
  supplyKey: z.string().optional().describe('Supply key (serialized string).'),
  feeScheduleKey: z
    .string()
    .optional()
    .describe('Fee schedule key (serialized string).'),
  pauseKey: z.string().optional().describe('Pause key (serialized string).'),
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

export class HederaCreateNftTool extends BaseHederaTransactionTool<
  typeof NFTCreateZodSchemaCore
> {
  name = 'hedera-hts-create-nft';
  description =
    'Creates a new Hedera Non-Fungible Token (NFT). Provide token details. Use metaOptions for execution control.';
  specificInputSchema = NFTCreateZodSchemaCore;

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
    const nftParams: NFTCreateParams = {
      tokenName: specificArgs.tokenName,
      tokenSymbol: specificArgs.tokenSymbol,
      treasuryAccountId: specificArgs.treasuryAccountId,
      supplyType:
        specificArgs.supplyType === SDKTokenSupplyType.Finite.toString()
          ? SDKTokenSupplyType.Finite
          : SDKTokenSupplyType.Infinite,
    };
    if (specificArgs.adminKey) {
      nftParams.adminKey = specificArgs.adminKey;
    }
    if (specificArgs.kycKey) {
      nftParams.kycKey = specificArgs.kycKey;
    }
    if (specificArgs.freezeKey) {
      nftParams.freezeKey = specificArgs.freezeKey;
    }
    if (specificArgs.wipeKey) {
      nftParams.wipeKey = specificArgs.wipeKey;
    }
    if (specificArgs.supplyKey) {
      nftParams.supplyKey = specificArgs.supplyKey;
    }
    if (specificArgs.feeScheduleKey) {
      nftParams.feeScheduleKey = specificArgs.feeScheduleKey;
    }
    if (specificArgs.pauseKey) {
      nftParams.pauseKey = specificArgs.pauseKey;
    }
    if (specificArgs.autoRenewAccountId) {
      nftParams.autoRenewAccountId = specificArgs.autoRenewAccountId;
    }
    if (specificArgs.autoRenewPeriod) {
      nftParams.autoRenewPeriod = specificArgs.autoRenewPeriod;
    }
    if (specificArgs.memo) {
      nftParams.memo = specificArgs.memo;
    }
    if (specificArgs.freezeDefault) {
      nftParams.freezeDefault = specificArgs.freezeDefault;
    }
    if (specificArgs.maxSupply) {
      nftParams.maxSupply =
        typeof specificArgs.maxSupply === 'string'
          ? new BigNumber(specificArgs.maxSupply)
          : specificArgs.maxSupply;
    }

    if (specificArgs.customFees) {
      nftParams.customFees = parseCustomFeesJson(
        specificArgs.customFees,
        this.logger
      );
    }
    (builder as HtsBuilder).createNonFungibleToken(nftParams);
  }
}
