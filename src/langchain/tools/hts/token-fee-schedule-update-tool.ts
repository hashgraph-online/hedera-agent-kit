import { z } from 'zod';
import { TokenFeeScheduleUpdateParams } from '../../../types';
import { CustomFee } from '@hashgraph/sdk'; // Added relevant SDK types
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';
import { parseCustomFeesJson } from './hts-tool-utils'; // Import shared helper

const TokenFeeScheduleUpdateZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe(
      'The ID of the token whose fee schedule is to be updated (e.g., "0.0.xxxx").'
    ),
  customFeesJson: z
    .string()
    .describe(
      'A JSON string representing an array of new CustomFee objects (e.g., CustomFixedFee, CustomFractionalFee). This will replace the existing fee schedule.'
    ),
});

export class HederaTokenFeeScheduleUpdateTool extends BaseHederaTransactionTool<
  typeof TokenFeeScheduleUpdateZodSchemaCore
> {
  name = 'hedera-hts-token-fee-schedule-update';
  description =
    'Updates the fee schedule of a token. Requires tokenId and a JSON string for customFees. Use metaOptions for execution control.';
  specificInputSchema = TokenFeeScheduleUpdateZodSchemaCore;

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
    let feesToSet: CustomFee[];
    try {
      feesToSet = parseCustomFeesJson(specificArgs.customFeesJson, this.logger);
    } catch (e: any) {
      // Error already logged by parseCustomFeesJson, rethrow to indicate failure to tool runner
      throw new Error(`Invalid customFeesJson: ${e.message}`);
    }

    const feeUpdateParams: TokenFeeScheduleUpdateParams = {
      tokenId: specificArgs.tokenId,
      customFees: feesToSet,
    };
    (builder as HtsBuilder).feeScheduleUpdate(feeUpdateParams);
  }
}
