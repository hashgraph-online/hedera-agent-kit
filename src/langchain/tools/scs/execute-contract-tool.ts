import { z } from 'zod';
import { ExecuteContractParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { ScsBuilder } from '../../../builders/scs/scs-builder';

const FunctionParameterInputSchema = z.object({
  type: z
    .string()
    .describe(
      'Parameter type (e.g., string, bytes, bytes32, bool, int8, int32, int64, int256, uint8, uint32, uint64, uint256, address).'
    ),
  value: z
    .any()
    .describe(
      'Parameter value. For bytes/bytes32, use hex string. For address, use "0.0.xxxx" string.'
    ),
});

const ExecuteContractZodSchemaCore = z.object({
  contractId: z
    .string()
    .describe('The ID of the contract to call (e.g., "0.0.xxxx").'),
  gas: z
    .union([z.number(), z.string()])
    .describe('Gas to use for the call. Builder handles Long conversion.'),
  functionName: z
    .string()
    .describe(
      'The function to call (e.g., "myFunction" or "myFunction(uint32)").'
    ),
  functionParameters: z
    .array(FunctionParameterInputSchema)
    .optional()
    .describe(
      'Optional. Array of function parameters, each with type and value. Builder parses and constructs.'
    ),
  payableAmount: z
    .union([z.number(), z.string()])
    .optional()
    .describe(
      'Optional. Amount in HBAR to send. Builder handles Hbar unit conversion.'
    ),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaExecuteContractTool extends BaseHederaTransactionTool<
  typeof ExecuteContractZodSchemaCore
> {
  name = 'hedera-scs-execute-contract';
  description =
    'Executes a smart contract function. Builder handles parameter parsing, type conversions, and Hbar unit logic.';
  specificInputSchema = ExecuteContractZodSchemaCore;
  namespace = 'scs';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.scs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof ExecuteContractZodSchemaCore>
  ): Promise<void> {
    await (builder as ScsBuilder).executeContract(
      specificArgs as unknown as ExecuteContractParams
    );
  }
}
