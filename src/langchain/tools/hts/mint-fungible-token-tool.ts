import { z } from 'zod';
import { MintFTParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const MintFTZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the fungible token (e.g., "0.0.xxxx").'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'Amount to mint (smallest unit). Number or string for large values. Builder handles conversion.'
    ),
});

export class HederaMintFungibleTokenTool extends BaseHederaTransactionTool<
  typeof MintFTZodSchemaCore
> {
  name = 'hedera-hts-mint-fungible-token';
  description = 'Mints more fungible tokens. Requires tokenId and amount.';
  specificInputSchema = MintFTZodSchemaCore;
  namespace = 'hts';

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
    await (builder as HtsBuilder).mintFungibleToken(
      specificArgs as unknown as MintFTParams
    );
  }
}
