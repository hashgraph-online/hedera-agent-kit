import { z } from 'zod';
import { AppendFileParams } from '../../../types';
import { Buffer } from 'buffer';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { FileBuilder } from '../../../builders/file/file-builder';

const AppendFileZodSchemaCore = z.object({
  fileId: z.string().describe('The ID of the file to append to (e.g., \"0.0.xxxx\").'),
  contents: z.string().describe('The content to append. Provide as a UTF-8 string or base64 encoded string for binary data.'),
  isBase64: z.boolean().optional().describe('Set to true if the contents string is base64 encoded.'),
});

export class HederaAppendFileTool extends BaseHederaTransactionTool<typeof AppendFileZodSchemaCore> {
  name = 'hedera-file-append';
  description = 'Appends content to an existing file. Provide fileId and contents (string or base64). Use metaOptions for execution control.';
  specificInputSchema = AppendFileZodSchemaCore;

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
    let fileContents: string | Uint8Array = specificArgs.contents;
    if (specificArgs.isBase64) {
      try {
        fileContents = Buffer.from(specificArgs.contents, 'base64');
      } catch (e) {
        this.logger.error('Failed to decode base64 contents for file append.', e);
        throw new Error('Invalid base64 string for file contents.');
      }
    }

    const appendParams: AppendFileParams = {
      fileId: specificArgs.fileId,
      contents: fileContents,
    };

    (builder as FileBuilder).appendFile(appendParams);
  }
}