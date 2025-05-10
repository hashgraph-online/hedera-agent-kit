import { z } from 'zod';
import { WipeTokenAccountParams } from '../../../types';
import { Long } from '@hashgraph/sdk';
import { BigNumber } from 'bignumber.js';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const WipeTokenAccountZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the token to wipe (e.g., "0.0.xxxx").'),
  accountId: z
    .string()
    .describe(
      'The account ID from which tokens will be wiped (e.g., "0.0.yyyy").'
    ),
  amount: z
    .union([z.number(), z.string()])
    .optional()
    .describe(
      'For Fungible Tokens: the amount to wipe (smallest unit). Number or string for large values.'
    ),
  serials: z
    .array(z.union([z.number(), z.string()]))
    .optional()
    .describe(
      'For Non-Fungible Tokens: an array of serial numbers (number or string) to wipe.'
    ),
});

export class HederaWipeTokenAccountTool extends BaseHederaTransactionTool<
  typeof WipeTokenAccountZodSchemaCore
> {
  name = 'hedera-hts-wipe-token-account';
  description =
    "Wipes tokens (fungible or non-fungible) from an account. Requires tokenId and accountId. Provide 'amount' for FTs or 'serials' for NFTs. Use metaOptions for execution control.";
  specificInputSchema = WipeTokenAccountZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof WipeTokenAccountZodSchemaCore>
  ): Promise<void> {
    const wipeParams: WipeTokenAccountParams = {
      tokenId: specificArgs.tokenId,
      accountId: specificArgs.accountId,
    };

    if (specificArgs.amount) {
      wipeParams.amount =
        typeof specificArgs.amount === 'string'
          ? new BigNumber(specificArgs.amount)
          : specificArgs.amount;
    }
    if (specificArgs.serials && specificArgs.serials.length > 0) {
      wipeParams.serials = specificArgs.serials as Array<
        number | Long | BigNumber
      >;
    }

    if (
      wipeParams.amount === undefined &&
      (wipeParams.serials === undefined || wipeParams.serials.length === 0)
    ) {
      throw new Error(
        'Either amount (for FT) or serials (for NFT) must be provided for wiping tokens.'
      );
    }
    (builder as HtsBuilder).wipeTokenAccount(wipeParams);
  }
}
