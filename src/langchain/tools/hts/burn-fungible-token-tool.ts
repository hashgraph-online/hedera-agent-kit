import { z } from 'zod';
import { BurnFTParams } from '../../../types';
import { BigNumber } from 'bignumber.js';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const BurnFTZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the fungible token to burn from (e.g., "0.0.xxxx").'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'The amount of tokens to burn (smallest unit). Number or string for large values.'
    ),
});

export class HederaBurnFungibleTokenTool extends BaseHederaTransactionTool<
  typeof BurnFTZodSchemaCore
> {
  name = 'hedera-hts-burn-fungible-token';
  description =
    'Burns fungible tokens. Requires tokenId and amount. Use metaOptions for execution control.';
  specificInputSchema = BurnFTZodSchemaCore;

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
    const burnParams: BurnFTParams = {
      tokenId: specificArgs.tokenId,
      amount:
        typeof specificArgs.amount === 'string'
          ? new BigNumber(specificArgs.amount)
          : specificArgs.amount,
    };
    (builder as HtsBuilder).burnFungibleToken(burnParams);
  }
}
