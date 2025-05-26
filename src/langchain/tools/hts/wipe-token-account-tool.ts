import { z } from 'zod';
import { WipeTokenAccountParams } from '../../../types';
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
      'For Fungible Tokens: amount to wipe (smallest unit). Builder handles conversion and validation.'
    ),
  serials: z
    .array(z.union([z.number().int().positive(), z.string()]))
    .optional()
    .describe(
      'For Non-Fungible Tokens: array of serial numbers to wipe. Builder handles conversion and validation.'
    ),
});

export class HederaWipeTokenAccountTool extends BaseHederaTransactionTool<
  typeof WipeTokenAccountZodSchemaCore
> {
  name = 'hedera-hts-wipe-token-account';
  description =
    "Wipes tokens (fungible or non-fungible) from an account. Provide 'amount' for FTs or 'serials' for NFTs. Builder validates inputs.";
  specificInputSchema = WipeTokenAccountZodSchemaCore;
  namespace = 'hts';

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
    await (builder as HtsBuilder).wipeTokenAccount(
      specificArgs as unknown as WipeTokenAccountParams
    );
  }
}
