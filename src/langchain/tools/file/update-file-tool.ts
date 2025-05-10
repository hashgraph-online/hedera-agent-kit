import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { UpdateFileParams, Key } from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { FileId, KeyList } from '@hashgraph/sdk'; // Added KeyList
import { Buffer } from 'buffer';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { FileBuilder } from '../../../builders/file/file-builder';

const UpdateFileZodSchemaCore = z.object({
  fileId: z
    .string()
    .describe('The ID of the file to update (e.g., "0.0.xxxx").'),
  contents: z
    .string()
    .optional()
    .describe(
      'Optional. New contents for the file. Provide as UTF-8 string or base64 encoded for binary. Replaces entire content.'
    ),
  isBase64: z
    .boolean()
    .optional()
    .describe('Set to true if new contents string is base64 encoded.'),
  keysJson: z
    .string()
    .optional()
    .describe(
      'Optional. New keys as a JSON string array of public/private key strings. Send "null" or empty array string "[]" to clear all keys, making file immutable (if no other keys like adminKey on file).'
    ),
  // memo is handled by metaOptions.transactionMemo in the base tool
});

export class HederaUpdateFileTool extends BaseHederaTransactionTool<
  typeof UpdateFileZodSchemaCore
> {
  name = 'hedera-file-update';
  description =
    "Updates a file's attributes (contents, keys, memo). Requires fileId. Use metaOptions for execution control (transactionMemo for file memo).";
  specificInputSchema = UpdateFileZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.fs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof UpdateFileZodSchemaCore>
  ): Promise<void> {
    const updateParams: UpdateFileParams = { fileId: specificArgs.fileId };

    if (specificArgs.contents) {
      if (specificArgs.isBase64) {
        try {
          updateParams.contents = Buffer.from(specificArgs.contents, 'base64');
        } catch (e) {
          this.logger.error(
            'Failed to decode base64 contents for file update.',
            e
          );
          throw new Error('Invalid base64 string for file contents.');
        }
      } else {
        updateParams.contents = specificArgs.contents;
      }
    }

    if (specificArgs.keysJson) {
      if (
        specificArgs.keysJson.toLowerCase() === 'null' ||
        specificArgs.keysJson === '[]'
      ) {
        updateParams.keys = null; // Signal to builder to clear keys
      } else {
        try {
          const parsedKeys = JSON.parse(specificArgs.keysJson) as string[];
          if (Array.isArray(parsedKeys)) {
            updateParams.keys = parsedKeys; // Builder handles string[] to Array<string | Key | KeyList>
          }
        } catch (e) {
          this.logger.warn(
            'Failed to parse keysJson string for UpdateFile, skipping key update.',
            e
          );
        }
      }
    }
    // File memo is set via metaOptions.transactionMemo by the base tool class.
    // The FileBuilder's updateFile method should ensure this is passed to transaction.setFileMemo().

    (builder as FileBuilder).updateFile(updateParams);
  }
}
