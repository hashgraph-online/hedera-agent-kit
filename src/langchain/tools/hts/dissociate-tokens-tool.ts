import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { DissociateTokensParams } from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { AccountId, TokenId } from '@hashgraph/sdk';
import { 
    BaseHederaTransactionTool, 
    BaseHederaTransactionToolParams 
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const DissociateTokensZodSchemaCore = z.object({
  accountId: z.string().describe('The account ID to dissociate tokens from (e.g., \"0.0.xxxx\").'),
  tokenIds: z.array(z.string()).describe('An array of token IDs to dissociate (e.g., [\"0.0.yyyy\", \"0.0.zzzz\"])'),
});

export class HederaDissociateTokensTool extends BaseHederaTransactionTool<typeof DissociateTokensZodSchemaCore> {
  name = 'hedera-hts-dissociate-tokens';
  description = 'Dissociates one or more Hedera tokens from an account. Requires accountId and an array of tokenIds. Use metaOptions for execution control.';
  specificInputSchema = DissociateTokensZodSchemaCore;

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
    if (!specificArgs.tokenIds || specificArgs.tokenIds.length === 0) {
      throw new Error('At least one tokenId must be provided for dissociation.');
    }
    const dissociateParams: DissociateTokensParams = {
      accountId: specificArgs.accountId,
      tokenIds: specificArgs.tokenIds,
    };
    (builder as HtsBuilder).dissociateTokens(dissociateParams);
  }
} 