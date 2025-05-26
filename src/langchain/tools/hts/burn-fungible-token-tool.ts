import { z } from 'zod';
import { BurnFTParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const BurnFTZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the fungible token (e.g., "0.0.xxxx").'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'Amount to burn (smallest unit). Number or string for large values. Builder handles conversion.'
    ),
});

export class HederaBurnFungibleTokenTool extends BaseHederaTransactionTool<
  typeof BurnFTZodSchemaCore
> {
  name = 'hedera-hts-burn-fungible-token';
  description = 'Burns fungible tokens. Requires tokenId and amount.';
  specificInputSchema = BurnFTZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof BurnFTZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).burnFungibleToken(
      specificArgs as unknown as BurnFTParams
    );
  }
}
