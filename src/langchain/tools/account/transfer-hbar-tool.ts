import { z } from 'zod';
import { HbarTransferParams, HbarTransfer } from '../../../types';
import { Hbar } from '@hashgraph/sdk';
import {
    BaseHederaTransactionTool,
    BaseHederaTransactionToolParams
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const TransferHbarZodSchemaCore = z.object({
  transfersJson: z.string().describe(
    'A JSON string representing an array of HBAR transfers. ' +
    'Each object: { accountId: string (e.g., \"0.0.xxxx\"), amount: number (in HBAR, + for credit, - for debit) }. ' +
    'The sum of all amounts must be zero.'
  ),
});

export class HederaTransferHbarTool extends BaseHederaTransactionTool<typeof TransferHbarZodSchemaCore> {
  name = 'hedera-account-transfer-hbar';
  description = 'Transfers HBAR between multiple accounts. Requires a JSON string for `transfersJson`. The sum of amounts must net zero. Use metaOptions for execution control.';
  specificInputSchema = TransferHbarZodSchemaCore;

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
    let parsedTransfers: any[];
    try {
      parsedTransfers = JSON.parse(specificArgs.transfersJson);
      if (!Array.isArray(parsedTransfers) || parsedTransfers.length === 0) {
        throw new Error('Parsed transfersJson is not a non-empty array.');
      }
    } catch (e: any) {
      this.logger.error('Failed to parse transfersJson string for HBAR transfer:', e.message);
      throw new Error(`Invalid transfersJson format for HBAR transfer: ${e.message}`);
    }

    const sdkHbarTransfers: HbarTransfer[] = parsedTransfers.map((item: any, index: number) => {
      const itemNumber = index + 1;
      if (item.accountId === undefined || item.amount === undefined) {
        throw new Error(`HBAR transfer item #${itemNumber} is missing required fields: accountId, amount.`);
      }
      if (typeof item.accountId !== 'string') {
        throw new Error(`HBAR transfer #${itemNumber} accountId must be a string.`);
      }
      if (typeof item.amount !== 'number') {
        // Unlike token amounts, Hbar constructor takes number in HBARs directly.
        throw new Error(`HBAR transfer #${itemNumber} amount must be a number (in HBARs).`);
      }
      return {
        accountId: item.accountId, // Builder will handle string to AccountId
        amount: new Hbar(item.amount as number), // amount is in HBARs
      };
    });

    const transferParams: HbarTransferParams = {
      transfers: sdkHbarTransfers,
    };

    (builder as AccountBuilder).transferHbar(transferParams);
  }
}