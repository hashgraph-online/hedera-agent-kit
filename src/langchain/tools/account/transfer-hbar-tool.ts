import { z } from 'zod';
import { HbarTransferParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const HbarTransferInputSchema = z.object({
  accountId: z
    .string()
    .describe('Account ID for the transfer (e.g., "0.0.xxxx").'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'HBAR amount. Positive for credit, negative for debit. Builder handles Hbar unit & sum validation.'
    ),
});

const TransferHbarZodSchemaCore = z.object({
  transfers: z
    .array(HbarTransferInputSchema)
    .min(1)
    .describe(
      'Array of HBAR transfers, each with accountId and amount in HBARs.'
    ),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaTransferHbarTool extends BaseHederaTransactionTool<
  typeof TransferHbarZodSchemaCore
> {
  name = 'hedera-account-transfer-hbar';
  description =
    'Transfers HBAR between accounts. Builder validates amounts and sum.';
  specificInputSchema = TransferHbarZodSchemaCore;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof TransferHbarZodSchemaCore>
  ): Promise<void> {
    await (builder as AccountBuilder).transferHbar(
      specificArgs as unknown as HbarTransferParams
    );
  }
}
