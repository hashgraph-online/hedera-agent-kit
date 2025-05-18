import {
  GenericPlugin,
  GenericPluginContext,
} from '@hashgraphonline/standards-agent-kit';
import { StructuredTool, DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * A simple plugin that says hello.
 */
export class HelloWorldPlugin extends GenericPlugin {
  id = 'hello-world-plugin';
  name = 'Hello World Plugin';
  description = 'A simple plugin that says hello.';
  version = '1.0.0';
  author = 'Hedera Agent Kit Demo';

  override async initialize(context: GenericPluginContext): Promise<void> {
    await super.initialize(context);
    this.context.logger.info('HelloWorldPlugin initialized');
  }

  getTools(): StructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'say_hello',
        description: 'Says hello to the given name.',
        schema: z.object({
          name: z.string().describe('The name to say hello to.'),
        }),
        func: async ({ name }: { name: string }): Promise<string> => {
          return `Hello, ${name}! This message is from the HelloWorldPlugin.`;
        },
      }),
    ];
  }
}
