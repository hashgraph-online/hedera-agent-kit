// Polyfill for Node.js environment if window/self are expected by dependencies
if (typeof window === 'undefined') {
  (global as any).window = {}; // A minimal mock for window
}
if (typeof self === 'undefined') {
  (global as any).self = global; // self usually refers to the global object
}

import * as dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import { HederaAgentKit } from '../src/agent';
import { ServerSigner } from '../src/signer/server-signer';
import { HederaNetworkType } from '../src/signer/abstract-signer';

// Import a couple of example tools (ensure these files exist and export the tools)
// For HCS tools (assuming they are in individual files now)
import { HederaCreateTopicTool } from '../src/langchain/tools/hcs/create-topic-tool';
// For HTS tools (assuming they are in individual files now)
// import { HederaCreateFungibleTokenTool } from '../src/langchain/tools/hts/create-fungible-token-tool';

import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { AIMessage, HumanMessage } from "@langchain/core/messages";
// import { ConversationTokenBufferMemory } from 'langchain/memory'; // Using simple chat history for now

async function main() {
  console.log('Starting Hedera Agent Kit LangChain Demo...');

  // --- 1. Load Environment Variables ---
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  const network = (process.env.HEDERA_NETWORK || 'testnet') as HederaNetworkType;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error(
      'HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env'
    );
  }
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY must be set in .env');
  }
  if (network !== 'testnet' && network !== 'mainnet') {
    throw new Error('HEDERA_NETWORK in .env must be \'testnet\' or \'mainnet\'.')
  }

  console.log(`Using Operator ID: ${operatorId} on ${network}`);

  // --- 2. Initialize Signer --- 
  const signer = new ServerSigner(operatorId, operatorKey, network);
  console.log('ServerSigner initialized.');

  // --- 3. Initialize HederaAgentKit ---
  // For this demo, pluginConfig is kept minimal. 
  // To demonstrate plugin loading, provide actual directories or packages.
  const kit = new HederaAgentKit(signer, { /* directories: ['./plugins'] */ });
  console.log('HederaAgentKit instance created.');

  // --- 4. Initialize the Kit (Loads tools, including plugins if configured) ---
  await kit.initialize();
  console.log('HederaAgentKit initialized (tools loaded).');

  // --- 5. Get Aggregated Tools from the Kit ---
  // Note: The user added // @ts-ignore for the aggregatedTools assignment in HederaAgentKit
  // This might mean the actual tool instances have schema issues that are suppressed there.
  const tools = kit.getAggregatedLangChainTools(); 
  console.log(`Retrieved ${tools.length} tools from HederaAgentKit.`);
  
  if (tools.length === 0) {
    console.warn('No tools were loaded. Ensure HederaCreateTopicTool is instantiated in HederaAgentKit.initialize and that the kit is importing it.');
    if (!tools.some(t => t.name === 'hedera-hcs-create-topic')) {
        console.log('Manually adding HederaCreateTopicTool for demo as it was not found in kit.aggregatedTools');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Bypassing LangChain tool type compatibility issue for demo purposes
        tools.push(new HederaCreateTopicTool({ hederaKit: kit }));
    }
    // Add more tools manually if needed for the demo scenario
  }
  
  console.log('Available tools for agent:', tools.map(tool => tool.name));

  // --- 6. Set up LangChain LLM, Prompt, and Memory ---
  const llm = new ChatOpenAI({
    apiKey: openaiApiKey,
    modelName: process.env.OPENAI_MODEL_NAME || 'gpt-3.5-turbo-0125', // or gpt-4o etc.
    temperature: 0.7,
  });

  // Using a simple chat history array instead of ConversationTokenBufferMemory for this basic demo
  const chatHistory: (HumanMessage | AIMessage)[] = [];

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant with access to Hedera specific tools. When asked to perform a Hedera transaction, use the available tools. Be concise.'],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  // --- 7. Create LangChain Agent and Executor ---
  const agent = await createOpenAIToolsAgent({ llm, tools, prompt });
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: true, // Set to true for detailed agent logs
  });
  console.log('LangChain agent and executor created.');

  // --- 8. Example Invocation ---
  const input1 = "Create a new HCS topic with the memo 'My First Topic via AgentKit Demo' and get me the transaction bytes.";
  console.log(`\nInvoking agent with: "${input1}"`);
  
  try {
    const result1 = await agentExecutor.invoke({
      input: input1,
      chat_history: chatHistory,
    });
    console.log('Agent Result 1:', result1.output);
    chatHistory.push(new HumanMessage(input1));
    chatHistory.push(new AIMessage(JSON.stringify(result1.output))); // Storing output for context

    // Example 2: Execute a transaction (if previous gave bytes for a simple one)
    // This part is more complex as it requires taking bytes and submitting them.
    // The current tools are designed to either execute OR give bytes based on an option.
    // For a second call, we might ask it to execute a pre-defined operation.
    const input2 = "Create another HCS topic, this time with the memo 'Second Topic - Execute directly' and execute it.";
    console.log(`\nInvoking agent with: "${input2}"`);
    const result2 = await agentExecutor.invoke({
        input: input2,
        chat_history: chatHistory,
    });
    console.log('Agent Result 2:', result2.output);

  } catch (e) {
    console.error('Error during agent invocation:', e);
  }

  console.log('\nDemo finished.');
}

main().catch(console.error); 