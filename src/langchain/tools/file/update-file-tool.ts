import { z } from 'zod';
import { UpdateFileParams } from '../../../types';
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
      'Optional. New file contents. For binary, use base64. Builder decodes & replaces content.'
    ),
  keys: z
    .array(z.string())
    .nullable()
    .optional()
    .describe(
      'Optional. New keys (array of serialized strings). Pass null or empty array to clear. Builder parses.'
    ),
  memo: z
    .string()
    .nullable()
    .optional()
    .describe('Optional. New file memo. Pass null or empty string to clear.'),
});

export class HederaUpdateFileTool extends BaseHederaTransactionTool<
  typeof UpdateFileZodSchemaCore
> {
  name = 'hedera-file-update';
  description =
    "Updates a file's attributes (contents, keys, memo). Builder handles parsing and clearing logic.";
  specificInputSchema = UpdateFileZodSchemaCore;
  namespace = 'file';

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
    await (builder as FileBuilder).updateFile(
      specificArgs as unknown as UpdateFileParams
    );
  }
}
