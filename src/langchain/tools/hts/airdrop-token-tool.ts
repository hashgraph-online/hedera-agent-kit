import { z } from 'zod';
import { AirdropTokenParams, AirdropRecipient } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const AirdropTokenZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the fungible token to airdrop (e.g., "0.0.xxxx").'),
  recipientsJson: z
    .string()
    .describe(
      'A JSON string representing an array of recipient objects. Each object: { accountId: string, amount: number | string }.'
    ),
});

export class HederaAirdropTokenTool extends BaseHederaTransactionTool<
  typeof AirdropTokenZodSchemaCore
> {
  name = 'hedera-hts-airdrop-token';
  description =
    'Airdrops fungible tokens from the operator to multiple recipients. Requires tokenId and a JSON string for recipients. Use metaOptions for execution control.';
  specificInputSchema = AirdropTokenZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof AirdropTokenZodSchemaCore>
  ): Promise<void> {
    let recipientsToUse: AirdropRecipient[];
    try {
      recipientsToUse = JSON.parse(
        specificArgs.recipientsJson
      ) as AirdropRecipient[];
      if (!Array.isArray(recipientsToUse) || recipientsToUse.length === 0) {
        throw new Error('Parsed recipientsJson is not a non-empty array.');
      }
      // TODO: Add runtime validation for each recipient object structure if needed beyond type assertion
    } catch (e: any) {
      this.logger.error(
        'Failed to parse recipientsJson string or validation failed:',
        e.message
      );
      throw new Error(`Invalid recipientsJson: ${e.message}`);
    }

    const airdropParams: AirdropTokenParams = {
      tokenId: specificArgs.tokenId,
      recipients: recipientsToUse,
    };
    (builder as HtsBuilder).airdropToken(airdropParams);
  }
}
