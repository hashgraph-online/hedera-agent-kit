import { z } from 'zod';
import { AirdropTokenParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const AirdropRecipientSchema = z.object({
  accountId: z.string().describe('Recipient account ID (e.g., "0.0.xxxx").'),
  amount: z
    .union([z.number(), z.string()])
    .describe('Amount in smallest unit. Builder handles Long conversion.'),
});

const AirdropTokenZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the fungible token to airdrop (e.g., "0.0.yyyy").'),
  recipients: z
    .array(AirdropRecipientSchema)
    .min(1)
    .describe('Array of recipient objects, each with accountId and amount.'),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaAirdropTokenTool extends BaseHederaTransactionTool<
  typeof AirdropTokenZodSchemaCore
> {
  name = 'hedera-hts-airdrop-token';
  description =
    'Airdrops fungible tokens to multiple recipients. Builder handles parsing and validation.';
  specificInputSchema = AirdropTokenZodSchemaCore;
  namespace = 'hts';

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
    await (builder as HtsBuilder).airdropToken(
      specificArgs as unknown as AirdropTokenParams
    );
  }
}
