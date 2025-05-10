import { z } from 'zod';
import { MintFTParams } from '../../../types';
import { BigNumber } from 'bignumber.js';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const MintFTZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the fungible token to mint for (e.g., "0.0.xxxx").'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'The amount of tokens to mint (smallest unit). Number or string for large values.'
    ),
});

export class HederaMintFungibleTokenTool extends BaseHederaTransactionTool<
  typeof MintFTZodSchemaCore
> {
  name = 'hedera-hts-mint-fungible-token';
  description =
    'Mints more fungible tokens. Requires tokenId and amount. Use metaOptions for execution control.';
  specificInputSchema = MintFTZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof MintFTZodSchemaCore>
  ): Promise<void> {
    const mintParams: MintFTParams = {
      tokenId: specificArgs.tokenId,
      amount:
        typeof specificArgs.amount === 'string'
          ? new BigNumber(specificArgs.amount)
          : specificArgs.amount,
    };
    (builder as HtsBuilder).mintFungibleToken(mintParams);
  }
}
