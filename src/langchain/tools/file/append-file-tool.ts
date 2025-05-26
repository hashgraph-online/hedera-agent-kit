import { z } from 'zod';
import { AppendFileParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { FileBuilder } from '../../../builders/file/file-builder';

const AppendFileZodSchemaCore = z.object({
  fileId: z
    .string()
    .describe('The ID of the file to append to (e.g., "0.0.xxxx").'),
  contents: z
    .string()
    .describe(
      'Content to append. For binary, use base64 string. Builder handles decoding & chunking.'
    ),
  maxChunks: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional. Max chunks for large content. Builder handles default.'
    ),
  chunkSize: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional. Chunk size in bytes. Builder handles default.'),
});

export class HederaAppendFileTool extends BaseHederaTransactionTool<
  typeof AppendFileZodSchemaCore
> {
  name = 'hedera-file-append';
  description =
    'Appends content to a file. Builder handles content decoding and chunking.';
  specificInputSchema = AppendFileZodSchemaCore;
  namespace = 'file';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.fs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof AppendFileZodSchemaCore>
  ): Promise<void> {
    await (builder as FileBuilder).appendFile(specificArgs as AppendFileParams);
  }
}
