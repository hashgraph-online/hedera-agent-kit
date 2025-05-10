import { z } from 'zod';
import { RevokeFungibleTokenAllowanceParams } from '../../../types';
import {
    BaseHederaTransactionTool,
    BaseHederaTransactionToolParams
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const RevokeFungibleTokenAllowanceZodSchemaCore = z.object({
  ownerAccountId: z.string().optional().describe('The token owner account ID (e.g., \"0.0.xxxx\"). Defaults to operator.'),
  spenderAccountId: z.string().describe('The spender account ID (e.g., \"0.0.yyyy\").'),
  tokenId: z.string().describe('The fungible token ID (e.g., \"0.0.zzzz\") for which allowance is revoked.'),
});

export class HederaRevokeFungibleTokenAllowanceTool extends BaseHederaTransactionTool<typeof RevokeFungibleTokenAllowanceZodSchemaCore> {
  name = 'hedera-account-revoke-fungible-token-allowance';
  description = 'Revokes/clears a fungible token allowance for a spender by setting it to zero. Requires spenderAccountId and tokenId. ownerAccountId defaults to operator. Use metaOptions for execution control.';
  specificInputSchema = RevokeFungibleTokenAllowanceZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof RevokeFungibleTokenAllowanceZodSchemaCore>
  ): Promise<void> {
    const revokeParams: RevokeFungibleTokenAllowanceParams = {
      spenderAccountId: specificArgs.spenderAccountId,
      tokenId: specificArgs.tokenId,
    };
    if (specificArgs.ownerAccountId ) {
      revokeParams.ownerAccountId = specificArgs.ownerAccountId;
    }
    (builder as AccountBuilder).revokeFungibleTokenAllowance(revokeParams);
  }
}