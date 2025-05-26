import { z } from 'zod';
import { DeleteFileParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { FileBuilder } from '../../../builders/file/file-builder';

const DeleteFileZodSchemaCore = z.object({
  fileId: z
    .string()
    .describe('The ID of the file to delete (e.g., "0.0.xxxx").'),
});

export class HederaDeleteFileTool extends BaseHederaTransactionTool<
  typeof DeleteFileZodSchemaCore
> {
  name = 'hedera-file-delete';
  description = 'Deletes a file from the Hedera File Service.';
  specificInputSchema = DeleteFileZodSchemaCore;
  namespace = 'file';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.fs();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof DeleteFileZodSchemaCore>
  ): Promise<void> {
    await (builder as FileBuilder).deleteFile(
      specificArgs as unknown as DeleteFileParams
    );
  }
}
