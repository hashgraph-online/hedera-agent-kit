import { z } from 'zod';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { AccountBuilder } from '../../../builders/account/account-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const DeleteNftSerialAllowancesZodSchemaCore = z.object({
  ownerAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. The ID of the NFT owner. Defaults to the operator/signer if not provided.'
    ),
  nftIdString: z
    .string()
    .describe(
      'The specific NFT ID including serial number (e.g., "0.0.token.serial") for which all spender allowances will be deleted.'
    ),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaDeleteNftSerialAllowancesTool extends BaseHederaTransactionTool<
  typeof DeleteNftSerialAllowancesZodSchemaCore
> {
  name = 'hedera-account-delete-nft-serial-allowances-for-all-spenders';
  description =
    'Deletes all allowances for a specific NFT serial (for all spenders), granted by an owner. This action must be signed by the NFT owner.';
  specificInputSchema = DeleteNftSerialAllowancesZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof DeleteNftSerialAllowancesZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).deleteNftSerialAllowancesForAllSpenders(
      specificArgs as any
    );
  }
}
