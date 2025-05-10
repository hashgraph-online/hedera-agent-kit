import { z } from 'zod';
import { UpdateTokenParams } from '../../../types';
import { AccountId, Key } from '@hashgraph/sdk';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const UpdateTokenZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the token to update (e.g., "0.0.xxxx").'),
  tokenName: z
    .string()
    .optional()
    .describe('Optional. New name. Use "null" to clear.'),
  tokenSymbol: z
    .string()
    .optional()
    .describe('Optional. New symbol. Use "null" to clear.'),
  treasuryAccountId: z
    .string()
    .optional()
    .describe('Optional. New treasury account ID.'),
  adminKey: z
    .string()
    .optional()
    .describe(
      'Optional. New admin key (serialized string or "null" to clear).'
    ),
  kycKey: z
    .string()
    .optional()
    .describe('Optional. New KYC key (serialized string or "null" to clear).'),
  freezeKey: z
    .string()
    .optional()
    .describe(
      'Optional. New freeze key (serialized string or "null" to clear).'
    ),
  wipeKey: z
    .string()
    .optional()
    .describe('Optional. New wipe key (serialized string or "null" to clear).'),
  supplyKey: z
    .string()
    .optional()
    .describe(
      'Optional. New supply key (serialized string or "null" to clear).'
    ),
  feeScheduleKey: z
    .string()
    .optional()
    .describe(
      'Optional. New fee schedule key (serialized string or "null" to clear).'
    ),
  pauseKey: z
    .string()
    .optional()
    .describe(
      'Optional. New pause key (serialized string or "null" to clear).'
    ),
  autoRenewAccountId: z
    .string()
    .optional()
    .describe('Optional. New auto-renew account ID or "null" to clear.'),
  autoRenewPeriod: z
    .number()
    .optional()
    .describe('Optional. New auto-renewal period in seconds.'),
  memo: z
    .string()
    .optional()
    .describe('Optional. New token memo. Use "null" or empty string to clear.'),
});

export class HederaUpdateTokenTool extends BaseHederaTransactionTool<
  typeof UpdateTokenZodSchemaCore
> {
  name = 'hedera-hts-update-token';
  description =
    'Updates an existing Hedera token. Requires tokenId and fields to update. Use metaOptions for execution control.';
  specificInputSchema = UpdateTokenZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof UpdateTokenZodSchemaCore>
  ): Promise<void> {
    const updateParams: UpdateTokenParams = { tokenId: specificArgs.tokenId };

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

    if (specificArgs.tokenName ) {
      processedVal = valOrNull(specificArgs.tokenName);
      if (processedVal ) {
        updateParams.tokenName = processedVal;
      }
    }
    if (specificArgs.tokenSymbol ) {
      processedVal = valOrNull(specificArgs.tokenSymbol);
      if (processedVal ) {
        updateParams.tokenSymbol = processedVal;
      }
    }
    if (specificArgs.treasuryAccountId ) {
      updateParams.treasuryAccountId = specificArgs.treasuryAccountId;
    }
    if (specificArgs.adminKey ) {
      processedVal = keyOrNull(specificArgs.adminKey);
      if (processedVal ) {
        updateParams.adminKey = processedVal;
      }
    }
    if (specificArgs.kycKey ) {
      processedVal = keyOrNull(specificArgs.kycKey);
      if (processedVal ) {
        updateParams.kycKey = processedVal;
      }
    }
    if (specificArgs.freezeKey ) {
      processedVal = keyOrNull(specificArgs.freezeKey);
      if (processedVal ) {
        updateParams.freezeKey = processedVal;
      }
    }
    if (specificArgs.wipeKey ) {
      processedVal = keyOrNull(specificArgs.wipeKey);
      if (processedVal ) {
        updateParams.wipeKey = processedVal;
      }
    }
    if (specificArgs.supplyKey ) {
      processedVal = keyOrNull(specificArgs.supplyKey);
      if (processedVal ) {
        updateParams.supplyKey = processedVal;
      }
    }
    if (specificArgs.feeScheduleKey ) {
      processedVal = keyOrNull(specificArgs.feeScheduleKey);
      if (processedVal ) {
        updateParams.feeScheduleKey = processedVal;
      }
    }
    if (specificArgs.pauseKey ) {
      processedVal = keyOrNull(specificArgs.pauseKey);
      if (processedVal ) {
        updateParams.pauseKey = processedVal;
      }
    }
    if (specificArgs.autoRenewAccountId ) {
      processedVal = valOrNull(specificArgs.autoRenewAccountId);
      if (processedVal ) {
        updateParams.autoRenewAccountId = processedVal as
          | string
          | AccountId
          | null;
      }
    }
    if (specificArgs.autoRenewPeriod ) {
      updateParams.autoRenewPeriod = specificArgs.autoRenewPeriod;
    }
    if (specificArgs.memo ) {
      processedVal = valOrNull(specificArgs.memo);
      if (processedVal ) {
        updateParams.memo = processedVal;
      }
    }
  }
}
