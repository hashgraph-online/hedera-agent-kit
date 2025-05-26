import { z } from 'zod';
import { CreateFileParams } from '../../../types';
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
      'File contents. For binary data, provide as base64 encoded string. Builder handles decoding.'
    ),
  keys: z
    .array(z.string())
    .optional()
    .describe(
      'Optional. Array of serialized key strings (e.g., private key hex, public key hex/DER) that can modify/delete the file. Builder handles parsing.'
    ),
  memo: z.string().optional().describe('Optional. Memo for the file.'),
});

export class HederaCreateFileTool extends BaseHederaTransactionTool<
  typeof CreateFileZodSchemaCore
> {
  name = 'hedera-file-create';
  description =
    'Creates a new file. Builder handles content decoding and key parsing.';
  specificInputSchema = CreateFileZodSchemaCore;
  namespace = 'file';

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
    await (builder as FileBuilder).createFile(
      specificArgs as unknown as CreateFileParams
    );
  }
}
