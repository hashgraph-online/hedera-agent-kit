import { z } from 'zod';
import { SignScheduledTransactionParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { AccountBuilder } from '../../../builders/account/account-builder';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';

const signAndExecuteScheduledTransactionSchema = z.object({
  scheduleId: z
    .string()
    .describe('The ID of the scheduled transaction (e.g., "0.0.SCHEDID").'),
  memo: z
    .string()
    .optional()
    .describe('Optional memo for the ScheduleSign transaction itself.'),
});

export class SignAndExecuteScheduledTransactionTool extends BaseHederaTransactionTool<
  typeof signAndExecuteScheduledTransactionSchema
> {
  name = 'hedera-sign-and-execute-scheduled-transaction';
  description =
    'Prepares a ScheduleSignTransaction to add a signature to an existing scheduled transaction. Depending on agent configuration, this will either return transaction bytes (for the user to sign and pay) or be executed directly by the agent (agent signs and pays).';
  specificInputSchema = signAndExecuteScheduledTransactionSchema;
  namespace = 'account';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
    this.neverScheduleThisTool = true; // Ensure this tool itself is never scheduled
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.accounts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof signAndExecuteScheduledTransactionSchema>
  ): Promise<void> {
    const accountBuilder = builder as AccountBuilder;
    const params: SignScheduledTransactionParams = {
      scheduleId: specificArgs.scheduleId,
    };
    if (specificArgs.memo && specificArgs.memo.trim() !== '') {
      params.memo = specificArgs.memo;
    }
    await accountBuilder.prepareSignScheduledTransaction(params);
  }
}
