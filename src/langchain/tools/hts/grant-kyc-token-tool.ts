import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { GrantKycTokenParams } from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { AccountId, TokenId } from '@hashgraph/sdk';
import { 
    BaseHederaTransactionTool, 
    BaseHederaTransactionToolParams 
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const GrantKycTokenZodSchemaCore = z.object({
  tokenId: z.string().describe('The ID of the token (e.g., "0.0.xxxx").'),
  accountId: z.string().describe('The account ID to be granted KYC for the token (e.g., "0.0.yyyy").'),
});

export class HederaGrantKycTokenTool extends BaseHederaTransactionTool<typeof GrantKycTokenZodSchemaCore> {
  name = 'hedera-hts-grant-kyc-token';
  description = 'Grants KYC to an account for a specific token. Requires tokenId and accountId. Use metaOptions for execution control.';
  specificInputSchema = GrantKycTokenZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof GrantKycTokenZodSchemaCore>
  ): Promise<void> {
    const grantParams: GrantKycTokenParams = {
      tokenId: specificArgs.tokenId,
      accountId: specificArgs.accountId,
    };
    (builder as HtsBuilder).grantKycToken(grantParams);
  }
} 