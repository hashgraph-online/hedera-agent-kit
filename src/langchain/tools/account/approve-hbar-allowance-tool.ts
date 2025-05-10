import { z } from 'zod';
import { ApproveHbarAllowanceParams } from '../../../types';
import { Hbar } from '@hashgraph/sdk';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountBuilder } from '../../../builders/account/account-builder';

const ApproveHbarAllowanceZodSchemaCore = z.object({
  ownerAccountId: z
    .string()
    .optional()
    .describe(
      'The HBAR owner account ID (e.g., "0.0.xxxx"). Defaults to operator if not provided.'
    ),
  spenderAccountId: z
    .string()
    .describe(
      'The spender account ID being granted the allowance (e.g., "0.0.yyyy").'
    ),
  amount: z
    .number()
    .describe(
      'The maximum HBAR amount (in HBAR, not tinybars) that the spender can use.'
    ),
});

export class HederaApproveHbarAllowanceTool extends BaseHederaTransactionTool<
  typeof ApproveHbarAllowanceZodSchemaCore
> {
  name = 'hedera-account-approve-hbar-allowance';
  description =
    'Approves an HBAR allowance for a spender. Requires spenderAccountId and amount (in HBAR). ownerAccountId defaults to operator. Use metaOptions for execution control.';
  specificInputSchema = ApproveHbarAllowanceZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof ApproveHbarAllowanceZodSchemaCore>
  ): Promise<void> {
    const allowanceParams: ApproveHbarAllowanceParams = {
      spenderAccountId: specificArgs.spenderAccountId,
      amount: new Hbar(specificArgs.amount), // amount is in HBAR
    };
    if (specificArgs.ownerAccountId ) {
      allowanceParams.ownerAccountId = specificArgs.ownerAccountId;
    }
    // The metaOptions.transactionMemo will be handled by the base class for the transaction memo
    (builder as AccountBuilder).approveHbarAllowance(allowanceParams);
  }
}
