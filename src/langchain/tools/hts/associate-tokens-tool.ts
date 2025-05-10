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
    .array(z.string())
    .describe(
      'An array of token IDs to associate (e.g., ["0.0.yyyy", "0.0.zzzz"])'
    ),
});

export class HederaAssociateTokensTool extends BaseHederaTransactionTool<
  typeof AssociateTokensZodSchemaCore
> {
  name = 'hedera-hts-associate-tokens';
  description =
    'Associates one or more Hedera tokens with an account. Requires accountId and an array of tokenIds. Use metaOptions for execution control.';
  specificInputSchema = AssociateTokensZodSchemaCore;

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
    if (!specificArgs.tokenIds || specificArgs.tokenIds.length === 0) {
      throw new Error('At least one tokenId must be provided for association.');
    }
    const associateParams: AssociateTokensParams = {
      accountId: specificArgs.accountId,
      tokenIds: specificArgs.tokenIds,
    };
    (builder as HtsBuilder).associateTokens(associateParams);
  }
}
