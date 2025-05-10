import { z } from 'zod';
import { Tool, ToolParams } from '@langchain/core/tools';
import { HederaAgentKit } from '../../../agent';
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

  // For direct Tool extension, schema is defined differently or input is just a string.
  // To use Zod with direct Tool extension, we'd parse in _call.
  // Let's make it expect a JSON string input for structured args for now.
  // Or, make input just the fileId string, and handle encoding via a fixed property or a more complex input structure if truly needed.
  // For simplicity for an LLM, let's make the primary input the fileId, and encoding an option.
  // StructuredTool is better for multiple inputs, but direct Tool can work with stringified JSON or single string.

  // Let's stick to the single string input for Tool, and user can specify encoding in the string if needed,
  // or we make the tool always return base64.
  // For better UX with options, we should ideally use StructuredTool.
  // Given the blocker with StructuredTool, let's use a simple string input for fileId and default to base64.
  // If we want options, the input can be a JSON string: "{\"fileId\": \"0.0.xxx\", \"outputEncoding\": \"utf8\"}"

  constructor({ hederaKit, logger, ...rest }: HederaGetFileContentsToolParams) {
    super(rest); // Pass ...rest for ToolParams like callbacks, verbose, etc.
    this.hederaKit = hederaKit;
    this.logger = logger || hederaKit.logger;
  }

  protected async _call(
    input: string | z.infer<typeof GetFileContentsZodSchema>
  ): Promise<string> {
    let args: z.infer<typeof GetFileContentsZodSchema>;
    try {
      if (typeof input === 'string') {
        // Attempt to parse if it's JSON, otherwise assume it's just the fileId
        try {
          args = GetFileContentsZodSchema.parse(JSON.parse(input));
        } catch (e) {
          // Assume input is just fileId if JSON parse fails or if it's not an object after parsing
          args = GetFileContentsZodSchema.parse({
            fileId: input,
            outputEncoding: 'base64',
          });
        }
      } else {
        args = GetFileContentsZodSchema.parse(input);
      }
    } catch (e: any) {
      return JSON.stringify({
        success: false,
        error: `Invalid input: ${e.message}`,
      });
    }

    this.logger.info(`Executing ${this.name} with args:`, args);
    try {
      const fileId = FileId.fromString(args.fileId);
      const query = new FileContentsQuery().setFileId(fileId);

      // FileContentsQuery can be expensive, so it requires payment.
      // The client used must have an operator and balance.
      const contentsBytes: Uint8Array = await query.execute(
        this.hederaKit.client
      );

      let outputContents: string;
      if (args.outputEncoding === 'utf8') {
        outputContents = Buffer.from(contentsBytes).toString('utf8');
      } else {
        // base64
        outputContents = Buffer.from(contentsBytes).toString('base64');
      }
      return JSON.stringify({
        success: true,
        fileId: args.fileId,
        encoding: args.outputEncoding,
        contents: outputContents,
      });
    } catch (error: any) {
      this.logger.error(
        `Error in ${this.name} for file ${args.fileId}: ${error.message}`,
        error
      );
      return JSON.stringify({
        success: false,
        error: error.message,
        fileId: args.fileId,
      });
    }
  }
}
