import { z } from 'zod';
import { CreateFileParams } from '../../../types';
import { Buffer } from 'buffer';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { FileBuilder } from '../../../builders/file/file-builder';

const CreateFileZodSchemaCore = z.object({
  contents: z
    .string()
    .describe(
      'The contents of the file. Provide as a UTF-8 string or base64 encoded string for binary data.'
    ),
  isBase64: z
    .boolean()
    .optional()
    .describe('Set to true if the contents string is base64 encoded.'),
  keysJson: z
    .string()
    .optional()
    .describe(
      'Optional. A JSON string representing an array of public key strings (hex or DER) or private key strings (hex) that can modify/delete the file.'
    ),
});

export class HederaCreateFileTool extends BaseHederaTransactionTool<
  typeof CreateFileZodSchemaCore
> {
  name = 'hedera-file-create';
  description =
    'Creates a new file on the Hedera File Service. Provide contents (string or base64). Optionally set keys. Use metaOptions for execution control (especially transactionMemo for file memo).';
  specificInputSchema = CreateFileZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.fs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof CreateFileZodSchemaCore>
  ): Promise<void> {
    let fileContents: string | Uint8Array = specificArgs.contents;
    if (specificArgs.isBase64) {
      try {
        fileContents = Buffer.from(specificArgs.contents, 'base64');
      } catch (e) {
        this.logger.error(
          'Failed to decode base64 contents for file creation.',
          e
        );
        throw new Error('Invalid base64 string for file contents.');
      }
    }

    const fileParams: CreateFileParams = {
      contents: fileContents,
    };

    if (specificArgs.keysJson) {
      try {
        const parsedKeys = JSON.parse(specificArgs.keysJson) as string[];
        if (Array.isArray(parsedKeys)) {
          fileParams.keys = parsedKeys;
        }
      } catch (e) {
        this.logger.warn(
          'Failed to parse keysJson string for CreateFile, skipping keys.',
          e
        );
      }
    }

    (builder as FileBuilder).createFile(fileParams);
  }
}
