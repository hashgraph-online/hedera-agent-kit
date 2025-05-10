import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { RejectAirdropParams } from '../../../types'; // Note: Builder uses this type name
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { TokenId } from '@hashgraph/sdk';
import { 
    BaseHederaTransactionTool, 
    BaseHederaTransactionToolParams 
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const RejectTokensZodSchemaCore = z.object({
  tokenId: z.string().describe('The ID of the token type for which the operator will reject future associations (e.g., \"0.0.xxxx\").'),
});

export class HederaRejectTokensTool extends BaseHederaTransactionTool<typeof RejectTokensZodSchemaCore> {
  name = 'hedera-hts-reject-tokens';
  description = 'Configures the operator to reject future auto-associations with a specific token type. Requires tokenId. Use metaOptions for execution control.';
  specificInputSchema = RejectTokensZodSchemaCore;

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
    const rejectParams: RejectAirdropParams = {
      tokenId: specificArgs.tokenId,
      // memo: specificArgs.metaOptions?.transactionMemo, // If metaOptions memo should apply here
    };
    (builder as HtsBuilder).rejectTokens(rejectParams);
  }
} 