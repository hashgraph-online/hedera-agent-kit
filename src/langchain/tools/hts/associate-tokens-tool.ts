import { z } from 'zod';
import { AssociateTokensParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const AssociateTokensZodSchemaCore = z.object({
  accountId: z
    .string()
    .describe('The account ID to associate tokens with (e.g., "0.0.xxxx").'),
  tokenIds: z
    .array(z.string().describe('A token ID (e.g., "0.0.yyyy").'))
    .min(1)
    .describe('An array of one or more token IDs to associate.'),
});

export class HederaAssociateTokensTool extends BaseHederaTransactionTool<
  typeof AssociateTokensZodSchemaCore
> {
  name = 'hedera-hts-associate-tokens';
  description = 'Associates one or more Hedera tokens with an account.';
  specificInputSchema = AssociateTokensZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof AssociateTokensZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).associateTokens(
      specificArgs as unknown as AssociateTokensParams
    );
  }
}
