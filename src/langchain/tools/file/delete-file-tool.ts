import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { DeleteFileParams } from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { FileId } from '@hashgraph/sdk';
import { 
    BaseHederaTransactionTool, 
    BaseHederaTransactionToolParams 
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { FileBuilder } from '../../../builders/file/file-builder';

const DeleteFileZodSchemaCore = z.object({
  fileId: z.string().describe('The ID of the file to delete (e.g., \"0.0.xxxx\").'),
});

export class HederaDeleteFileTool extends BaseHederaTransactionTool<typeof DeleteFileZodSchemaCore> {
  name = 'hedera-file-delete';
  description = 'Deletes a file from the Hedera File Service. Requires fileId. Use metaOptions for execution control.';
  specificInputSchema = DeleteFileZodSchemaCore;

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
    const deleteParams: DeleteFileParams = {
      fileId: specificArgs.fileId,
    };
    (builder as FileBuilder).deleteFile(deleteParams);
  }
} 