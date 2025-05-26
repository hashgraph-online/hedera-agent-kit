import { z } from 'zod';
import { DissociateTokensParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const DissociateTokensZodSchemaCore = z.object({
  accountId: z
    .string()
    .describe('The account ID to dissociate tokens from (e.g., "0.0.xxxx").'),
  tokenIds: z
    .array(z.string().describe('A token ID (e.g., "0.0.yyyy").'))
    .min(1)
    .describe('An array of one or more token IDs to dissociate.'),
});

export class HederaDissociateTokensTool extends BaseHederaTransactionTool<
  typeof DissociateTokensZodSchemaCore
> {
  name = 'hedera-hts-dissociate-tokens';
  description = 'Dissociates one or more Hedera tokens from an account.';
  specificInputSchema = DissociateTokensZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof DissociateTokensZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).dissociateTokens(
      specificArgs as unknown as DissociateTokensParams
    );
  }
}
