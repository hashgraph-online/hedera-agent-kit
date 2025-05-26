import { z } from 'zod';
import { RevokeKycTokenParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const RevokeKycTokenZodSchemaCore = z.object({
  tokenId: z.string().describe('The ID of the token (e.g., "0.0.xxxx").'),
  accountId: z
    .string()
    .describe(
      'The account ID to have KYC revoked for the token (e.g., "0.0.yyyy").'
    ),
});

export class HederaRevokeKycTokenTool extends BaseHederaTransactionTool<
  typeof RevokeKycTokenZodSchemaCore
> {
  name = 'hedera-hts-revoke-kyc-token';
  description = 'Revokes KYC from an account for a specific token.';
  specificInputSchema = RevokeKycTokenZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof RevokeKycTokenZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).revokeKycToken(
      specificArgs as RevokeKycTokenParams
    );
  }
}
