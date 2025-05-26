import { z } from 'zod';
import { FreezeTokenAccountParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const FreezeTokenAccountZodSchemaCore = z.object({
  tokenId: z.string().describe('The ID of the token (e.g., "0.0.xxxx").'),
  accountId: z
    .string()
    .describe('The account ID to be frozen for the token (e.g., "0.0.yyyy").'),
});

export class HederaFreezeTokenAccountTool extends BaseHederaTransactionTool<
  typeof FreezeTokenAccountZodSchemaCore
> {
  name = 'hedera-hts-freeze-token-account';
  description = 'Freezes an account for a specific token.';
  specificInputSchema = FreezeTokenAccountZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof FreezeTokenAccountZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).freezeTokenAccount(
      specificArgs as unknown as FreezeTokenAccountParams
    );
  }
}
