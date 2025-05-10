import { z } from 'zod';
import { ExecuteContractParams } from '../../../types';
import {
  Hbar,
  Long,
  ContractFunctionParameters,
  AccountId,
} from '@hashgraph/sdk';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { ScsBuilder } from '../../../builders/scs/scs-builder';
import { BigNumber } from 'bignumber.js';
import { Buffer } from 'buffer';

const ExecuteContractZodSchemaCore = z.object({
  contractId: z
    .string()
    .describe('The ID of the contract to call (e.g., "0.0.xxxx").'),
  gas: z
    .union([z.number(), z.string()])
    .describe('Gas to use for the call (number or string for large values).'),
  functionName: z
    .string()
    .describe(
      'The function to call (e.g., "myFunction" or "myFunction(uint32)").'
    ),
  functionParametersJson: z
    .string()
    .optional()
    .describe(
      'Optional. A JSON string representing an array of function parameters. Each object in the array should have a `type` and `value`. ' +
        'Supported types: string, bytes, bytes32, bool, int8, int32, int64, int256, uint8, uint32, uint64, uint256, address (for AccountId or ContractId string). ' +
        'Example: `[{"type":"string","value":"hello"}, {"type":"uint32","value":123}, {"type":"address","value":"0.0.12345"}]`'
    ),
  payableAmount: z
    .union([z.number(), z.string()])
    .optional()
    .describe(
      'Optional. Amount in HBAR (e.g., 10.5) or tinybars as string (e.g., "100000000") to send with the call for payable functions.'
    ),
});

export class HederaExecuteContractTool extends BaseHederaTransactionTool<
  typeof ExecuteContractZodSchemaCore
> {
  name = 'hedera-scs-execute-contract';
  description =
    'Executes a function of a smart contract. Requires contractId, gas, and functionName. functionParametersJson and payableAmount are optional. Use metaOptions for execution control.';
  specificInputSchema = ExecuteContractZodSchemaCore;

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
    const execParams: ExecuteContractParams = {
      contractId: specificArgs.contractId,
      gas:
        typeof specificArgs.gas === 'string'
          ? Long.fromString(specificArgs.gas)
          : Long.fromNumber(specificArgs.gas),
      functionName: specificArgs.functionName,
    };

    if (specificArgs.functionParametersJson) {
      try {
        const parsedParams = JSON.parse(
          specificArgs.functionParametersJson
        ) as any[];
        if (!Array.isArray(parsedParams)) {
          throw new Error('functionParametersJson did not parse to an array.');
        }

        const contractParams = new ContractFunctionParameters();
        for (const p of parsedParams) {
          if (p.value === undefined || p.type === undefined) {
            throw new Error(
              'Each parameter object must have a `type` and `value`.'
            );
          }
          switch (p.type.toLowerCase()) {
            case 'string': {
              contractParams.addString(p.value as string);
              break;
            }
            case 'bytes': {
              contractParams.addBytes(
                typeof p.value === 'string'
                  ? Buffer.from(p.value, 'hex')
                  : (p.value as Uint8Array)
              );
              break;
            }
            case 'bytes32': {
              contractParams.addBytes32(
                typeof p.value === 'string'
                  ? Buffer.from(p.value, 'hex')
                  : (p.value as Uint8Array)
              );
              break;
            }
            case 'bool': {
              contractParams.addBool(p.value as boolean);
              break;
            }
            case 'int8': {
              contractParams.addInt8(p.value as number);
              break;
            }
            case 'int32': {
              contractParams.addInt32(p.value as number);
              break;
            }
            case 'int64': {
              contractParams.addInt64(
                typeof p.value === 'string'
                  ? Long.fromString(p.value)
                  : Long.fromNumber(p.value as number)
              );
              break;
            }
            case 'int256': {
              let valToAdd: BigNumber | Uint8Array;
              if (typeof p.value === 'string') {
                valToAdd = p.value.startsWith('0x')
                  ? new BigNumber(p.value)
                  : new BigNumber('0x' + p.value);
              } else if (typeof p.value === 'number') {
                valToAdd = new BigNumber(p.value);
              } else {
                valToAdd = p.value as BigNumber | Uint8Array;
              }
              contractParams.addInt256(valToAdd as number | BigNumber | Long);
              break;
            }
            case 'uint8': {
              contractParams.addUint8(p.value as number);
              break;
            }
            case 'uint32': {
              contractParams.addUint32(p.value as number);
              break;
            }
            case 'uint64': {
              contractParams.addUint64(
                typeof p.value === 'string'
                  ? Long.fromString(p.value)
                  : Long.fromNumber(p.value as number)
              );
              break;
            }
            case 'uint256': {
              let valToAdd: BigNumber | Uint8Array;
              if (typeof p.value === 'string') {
                valToAdd = p.value.startsWith('0x')
                  ? new BigNumber(p.value)
                  : new BigNumber('0x' + p.value);
              } else if (typeof p.value === 'number') {
                valToAdd = new BigNumber(p.value);
              } else {
                valToAdd = p.value as BigNumber | Uint8Array;
              }
              contractParams.addUint256(valToAdd as number | BigNumber | Long);
              break;
            }
            case 'address': {
              contractParams.addAddress(
                AccountId.fromString(p.value as string).toSolidityAddress()
              );
              break;
            }
            default: {
              throw new Error(
                `Unsupported parameter type in functionParametersJson: ${p.type}`
              );
            }
          }
        }
        execParams.functionParameters = contractParams;
      } catch (e: unknown) {
        const error = e as Error;
        this.logger.error(
          'Failed to parse or process functionParametersJson',
          error.message
        );
        throw new Error(`Invalid functionParametersJson: ${error.message}`);
      }
    }

    if (specificArgs.payableAmount) {
      if (typeof specificArgs.payableAmount === 'string') {
        execParams.payableAmount = Hbar.fromTinybars(
          specificArgs.payableAmount
        );
      } else {
        execParams.payableAmount = new Hbar(specificArgs.payableAmount);
      }
    }

    (builder as ScsBuilder).executeContract(execParams);
  }
}
