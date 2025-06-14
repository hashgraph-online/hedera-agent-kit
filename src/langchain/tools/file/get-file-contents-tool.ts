import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';
import { FileId, FileContentsQuery } from '@hashgraph/sdk';
import { Buffer } from 'buffer';

const GetFileContentsZodSchema = z.object({
  fileId: z
    .string()
    .describe(
      'The ID of the file to retrieve contents for (e.g., "0.0.xxxx").'
    ),
  outputEncoding: z
    .enum(['utf8', 'base64'])
    .optional()
    .default('base64')
    .describe(
      'Encoding for the output contents (utf8 or base64). Defaults to base64.'
    ),
});

export interface HederaGetFileContentsToolParams
  extends BaseHederaQueryToolParams {}

export class HederaGetFileContentsTool extends BaseHederaQueryTool<
  typeof GetFileContentsZodSchema
> {
  name = 'hedera-file-get-contents';
  description =
    'Retrieves the contents of a file from the Hedera File Service. Requires fileId. Returns contents as base64 string by default, or utf8.';
  specificInputSchema = GetFileContentsZodSchema;
  namespace = 'file';

  constructor(params: HederaGetFileContentsToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetFileContentsZodSchema>
  ): Promise<{
    fileId: string;
    contents: string;
    encoding: string;
    size: number;
  }> {
    this.logger.info(`Getting contents of file: ${args.fileId}`);

    try {
      const fileId = FileId.fromString(args.fileId);
      const query = new FileContentsQuery().setFileId(fileId);

      const contentsBytes: Uint8Array = await query.execute(
        this.hederaKit.client
      );
      const buffer = Buffer.from(contentsBytes);

      let outputContents: string;
      if (args.outputEncoding === 'utf8') {
        outputContents = buffer.toString('utf8');
      } else {
        outputContents = buffer.toString('base64');
      }

      this.logger.info(
        `Successfully retrieved file contents for ${args.fileId} (${
          buffer.length
        } bytes, encoded as ${args.outputEncoding || 'base64'})`
      );

      return {
        fileId: args.fileId,
        contents: outputContents,
        encoding: args.outputEncoding || 'base64',
        size: buffer.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get file contents: ${errorMessage}`);
      throw new Error(`Failed to get file contents: ${errorMessage}`);
    }
  }

  protected getFieldProcessingConfig(): Record<
    string,
    {
      maxLength: number;
      truncateMessage: string;
    }
  > {
    return {
      contents: {
        maxLength: 50000,
        truncateMessage: '... [content truncated due to length]',
      },
    };
  }
}
