import { z } from 'zod';
import { ApproveHbarAllowanceParams } from '../../../types';
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
      'Optional. The HBAR owner account ID (e.g., "0.0.xxxx"). Defaults to operator if not provided.'
    ),
  spenderAccountId: z
    .string()
    .describe(
      'The spender account ID being granted the allowance (e.g., "0.0.yyyy").'
    ),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'Max HBAR amount spender can use (in HBARs). Builder handles Hbar object creation.'
    ),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaApproveHbarAllowanceTool extends BaseHederaTransactionTool<
  typeof ApproveHbarAllowanceZodSchemaCore
> {
  name = 'hedera-account-approve-hbar-allowance';
  description =
    'Approves an HBAR allowance for a spender. Builder handles Hbar unit conversion.';
  specificInputSchema = ApproveHbarAllowanceZodSchemaCore;
  namespace = 'account';

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
    await (builder as AccountBuilder).approveHbarAllowance(
      specificArgs as unknown as ApproveHbarAllowanceParams
    );
  }
}
