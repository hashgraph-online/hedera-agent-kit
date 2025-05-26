import { z } from 'zod';
import { RejectAirdropParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const RejectTokensZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe(
      'The ID of the token type to reject future associations with (e.g., "0.0.xxxx").'
    ),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaRejectTokensTool extends BaseHederaTransactionTool<
  typeof RejectTokensZodSchemaCore
> {
  name = 'hedera-hts-reject-tokens';
  description =
    'Configures the operator to reject future auto-associations with a specific token type.';
  specificInputSchema = RejectTokensZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof RejectTokensZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).rejectTokens(
      specificArgs as unknown as RejectAirdropParams
    );
  }
}
