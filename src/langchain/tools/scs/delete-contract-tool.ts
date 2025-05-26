import { z } from 'zod';
import { DeleteContractParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { ScsBuilder } from '../../../builders/scs/scs-builder';

const DeleteContractZodSchemaCore = z.object({
  contractId: z
    .string()
    .describe('The ID of the contract to delete (e.g., "0.0.xxxx").'),
  transferAccountId: z
    .string()
    .optional()
    .describe(
      'Optional. Account ID to transfer balance to. Builder validates if needed.'
    ),
  transferContractId: z
    .string()
    .optional()
    .describe(
      'Optional. Contract ID to transfer balance to. Builder validates if needed.'
    ),
});

export class HederaDeleteContractTool extends BaseHederaTransactionTool<
  typeof DeleteContractZodSchemaCore
> {
  name = 'hedera-scs-delete-contract';
  description =
    'Deletes a smart contract. Optionally specify a transfer target for any remaining balance.';
  specificInputSchema = DeleteContractZodSchemaCore;
  namespace = 'scs';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.scs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof DeleteContractZodSchemaCore>
  ): Promise<void> {
    await (builder as ScsBuilder).deleteContract(
      specificArgs as unknown as DeleteContractParams
    );
  }
}
