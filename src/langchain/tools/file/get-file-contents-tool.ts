import { z } from 'zod';
import { Tool, ToolParams } from '@langchain/core/tools';
import { HederaAgentKit } from '../../../agent/agent';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
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

export interface HederaGetFileContentsToolParams extends ToolParams {
  hederaKit: HederaAgentKit;
  logger?: StandardsSdkLogger;
}

export class HederaGetFileContentsTool extends Tool {
  protected hederaKit: HederaAgentKit;
  protected logger: StandardsSdkLogger;

  name = 'hedera-file-get-contents';
  description =
    'Retrieves the contents of a file from the Hedera File Service. Requires fileId. Returns contents as base64 string by default, or utf8.';

  constructor({ hederaKit, logger, ...rest }: HederaGetFileContentsToolParams) {
    super(rest);
    this.hederaKit = hederaKit;
    this.logger = logger || hederaKit.logger;
  }

  protected async _call(
    input: string | z.infer<typeof GetFileContentsZodSchema>
  ): Promise<string> {
    let args: z.infer<typeof GetFileContentsZodSchema>;
    try {
      if (typeof input === 'string') {
        try {
          args = GetFileContentsZodSchema.parse(JSON.parse(input));
        } catch (e: unknown) {
          const error = e as Error;
          throw new Error(
            `Error parsing input: ${error.message}. Expected JSON string with fileId and optional outputEncoding.`
          );
        }
      } else {
        args = GetFileContentsZodSchema.parse(input);
      }
    } catch (e: unknown) {
      const error = e as Error;
      return JSON.stringify({
        success: false,
        error: `Invalid input: ${error.message}`,
      });
    }

    this.logger.info(`Executing ${this.name} with args:`, args);
    try {
      const fileId = FileId.fromString(args.fileId);
      const query = new FileContentsQuery().setFileId(fileId);

      const contentsBytes: Uint8Array = await query.execute(
        this.hederaKit.client
      );

      let outputContents: string;
      if (args.outputEncoding === 'utf8') {
        outputContents = Buffer.from(contentsBytes).toString('utf8');
      } else {
        outputContents = Buffer.from(contentsBytes).toString('base64');
      }
      return JSON.stringify({
        success: true,
        fileId: args.fileId,
        encoding: args.outputEncoding,
        contents: outputContents,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error in ${this.name} for file ${args.fileId}: ${errorMessage}`,
        error
      );
      return JSON.stringify({
        success: false,
        error: errorMessage,
        fileId: args.fileId,
      });
    }
  }
}
