import { HederaAgentKit } from '../../src/agent';
import { ServerSigner } from '../../src/signer/server-signer';
import { StructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.test from the hedera-agent-kit directory
// Assumes .env.test is in the root of the hedera-agent-kit package
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

/**
 * Initializes HederaAgentKit with a ServerSigner for testing.
 * Reads Hedera Testnet account ID and private key from environment variables.
 */
export async function initializeTestKit(): Promise<HederaAgentKit> {
  const accountId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  const openAIApiKey = process.env.OPENAI_API_KEY;

  if (!accountId || !privateKey) {
    throw new Error(
      'HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY must be set in .env.test or environment variables.'
    );
  }
  if (!openAIApiKey) {
    throw new Error(
      'OPENAI_API_KEY must be set in .env.test or environment variables for agent execution.'
    );
  }

  const signer = new ServerSigner(accountId, privateKey, 'testnet');
  // Pass the OpenAI API key via appConfig so tools or agents needing it can access it
  const kit = new HederaAgentKit(signer, { appConfig: { openAIApiKey } }); 
  await kit.initialize();
  return kit;
}

/**
 * Creates a unique name string, typically for entities like tokens or topics,
 * by appending a timestamp and a short random string to a prefix.
 * @param prefix - The prefix for the name.
 * @returns A unique name string.
 */
export function generateUniqueName(prefix: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${randomSuffix}`;
}

/**
 * Introduces a delay for a specified number of milliseconds.
 * @param ms - The number of milliseconds to delay.
 * @returns A promise that resolves after the delay.
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const AGENT_PROMPT_TEMPLATE = `You are a helpful assistant that uses tools to perform actions on the Hedera network.

TOOLS:
------
Assistant has access to the following tools:

{tools}

To use a tool, please use the following format:

\\\`\\\`\\\`
Thought: Do I need to use a tool? Yes
Action: The action to take. Must be one of [{tool_names}]
Action Input: The input to the action
Observation: The result of the action
\\\`\\\`\\\`

When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:

\\\`\\\`\\\`
Thought: Do I need to use a tool? No
Final Answer: [your response here]
\\\`\\\`\\\`

Begin!

New input: {input}
{agent_scratchpad}
`;

/**
 * Creates a minimal LangChain agent executor configured with the provided tool.
 * This allows simulating how a LangChain agent would invoke the tool.
 * @param tool - The StructuredTool to be used by the agent.
 * @param openAIApiKey - The OpenAI API key.
 * @returns An AgentExecutor instance.
 */
export async function createTestAgentExecutor(tool: StructuredTool, openAIApiKey: string): Promise<AgentExecutor> {
  const tools = [tool];
  
  const llm = new ChatOpenAI({
    apiKey: openAIApiKey,
    modelName: 'gpt-3.5-turbo-1106', // Or your preferred model
    temperature: 0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", AGENT_PROMPT_TEMPLATE],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  const agent = await createOpenAIToolsAgent({ llm, tools, prompt });

  return new AgentExecutor({
    agent,
    tools,
    verbose: process.env.VERBOSE_AGENT_LOGGING === 'true', // Control verbosity via env var
  });
}
 