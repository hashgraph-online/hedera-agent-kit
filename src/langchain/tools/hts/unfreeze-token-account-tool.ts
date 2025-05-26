import { z } from 'zod';
import { UnfreezeTokenAccountParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const UnfreezeTokenAccountZodSchemaCore = z.object({
  tokenId: z.string().describe('The ID of the token (e.g., "0.0.xxxx").'),
  accountId: z
    .string()
    .describe(
      'The account ID to be unfrozen for the token (e.g., "0.0.yyyy").'
    ),
});

export class HederaUnfreezeTokenAccountTool extends BaseHederaTransactionTool<
  typeof UnfreezeTokenAccountZodSchemaCore
> {
  name = 'hedera-hts-unfreeze-token-account';
  description = 'Unfreezes an account for a specific token.';
  specificInputSchema = UnfreezeTokenAccountZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof UnfreezeTokenAccountZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).unfreezeTokenAccount(
      specificArgs as unknown as UnfreezeTokenAccountParams
    );
  }
}
