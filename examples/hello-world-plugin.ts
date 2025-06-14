import { BasePlugin } from '../src/plugins';
import type { GenericPluginContext, HederaTool } from '../src/plugins';
import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../src/langchain/tools/common/base-hedera-query-tool';
import { HederaAgentKit } from '../src/agent/agent';

/**
 * Zod schema for the say_hello tool input
 */
const SayHelloSchema = z.object({
  name: z.string().describe('The name to say hello to.'),
});

/**
 * A simple query tool that says hello
 */
class SayHelloTool extends BaseHederaQueryTool<typeof SayHelloSchema> {
  name = 'say_hello';
  description = 'Says hello to the given name.';
  specificInputSchema = SayHelloSchema;
  namespace = 'hello_world';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof SayHelloSchema>
  ): Promise<unknown> {
    const { name } = args;
    const message = `Hello, ${name}! This message is from the HelloWorldPlugin.`;

    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * A simple plugin that says hello.
 */
export class HelloWorldPlugin extends BasePlugin {
  id = 'hello-world-plugin';
  name = 'Hello World Plugin';
  description = 'A simple plugin that says hello.';
  version = '1.0.0';
  author = 'Hedera Agent Kit Demo';
  namespace = 'hello_world';

  private tools: HederaTool[] = [];

  async initialize(context: GenericPluginContext): Promise<void> {
    await super.initialize(context);
    this.context.logger.info('HelloWorldPlugin initialized');

    // Create the tool with HederaAgentKit from context
    const hederaKit = context.config.hederaKit as HederaAgentKit;
    if (hederaKit) {
      this.tools = [
        new SayHelloTool({
          hederaKit,
        }),
      ];
    } else {
      this.context.logger.warn(
        'HederaKit not found in context, tools will not be available'
      );
    }
  }

  getTools(): HederaTool[] {
    return this.tools;
  }
}
