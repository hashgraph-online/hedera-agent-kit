import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { DeleteContractParams } from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { ContractId, AccountId } from '@hashgraph/sdk';
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
      'Optional. Account ID to transfer contract balance to. Use this OR transferContractId if contract has balance.'
    ),
  transferContractId: z
    .string()
    .optional()
    .describe(
      'Optional. Contract ID to transfer contract balance to. Use this OR transferAccountId if contract has balance.'
    ),
});

export class HederaDeleteContractTool extends BaseHederaTransactionTool<
  typeof DeleteContractZodSchemaCore
> {
  name = 'hedera-scs-delete-contract';
  description =
    'Deletes a smart contract. Requires contractId. Optionally specify transferAccountId or transferContractId if contract has balance. Use metaOptions for execution control.';
  specificInputSchema = DeleteContractZodSchemaCore;

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
    const deleteParams: DeleteContractParams = {
      contractId: specificArgs.contractId,
    };
    if (specificArgs.transferAccountId) {
      deleteParams.transferAccountId = specificArgs.transferAccountId;
    }
    if (specificArgs.transferContractId) {
      deleteParams.transferContractId = specificArgs.transferContractId;
    }
    (builder as ScsBuilder).deleteContract(deleteParams);
  }
}
