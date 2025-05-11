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
import { Hbar, Transaction, TransactionId } from '@hashgraph/sdk';
import { Buffer } from 'buffer';

import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import * as readline from 'readline';

// Function to create readline interface
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function main() {
  console.log('Starting Hedera Agent Kit Interactive LangChain Demo...');

  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_PRIVATE_KEY;
  const network = (process.env.HEDERA_NETWORK ||
    'testnet') as HederaNetworkType;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const userAccountId = process.env.USER_ACCOUNT_ID;
  const userPrivateKey = process.env.USER_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error(
      'HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env'
    );
  }
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY must be set in .env');
  }

  console.log(
    `Using Operator ID (Agent's Signer): ${operatorId} on ${network}`
  );
  if (userAccountId && userPrivateKey) {
    console.log(
      `User Account ID (for user-signed transactions): ${userAccountId} is configured.`
    );
  } else {
    console.warn(
      'USER_ACCOUNT_ID and/or USER_PRIVATE_KEY are not set in .env. User-signed execution will not be available for this demo.'
    );
  }

  const agentSigner = new ServerSigner(operatorId, operatorKey, network);
  const kit = new HederaAgentKit(agentSigner, {});
  await kit.initialize();

  const allToolsFromKit = kit.getAggregatedLangChainTools();
  const requiredToolNames = [
    'hedera-hcs-create-topic',
    'hedera-hcs-submit-message',
    'hedera-account-transfer-hbar',
  ];
  const tools = allToolsFromKit.filter((tool) =>
    requiredToolNames.includes(tool.name)
  );

  if (tools.length !== requiredToolNames.length) {
    const missing = requiredToolNames.filter(
      (tn) => !tools.find((t) => t.name === tn)
    );
    throw new Error(
      `Demo requires tools: ${missing.join(
        ', '
      )} but they were not found in the kit.`
    );
  }
  console.log(
    `Using ${tools.length} tools for the agent:`,
    tools.map((tool) => tool.name)
  );

  const llm = new ChatOpenAI({
    apiKey: openaiApiKey,
    modelName: process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    temperature: 0.1,
  });

  const chatHistory: (HumanMessage | AIMessage)[] = [];

  let systemMessage =
    `You are a helpful Hedera assistant for account ${operatorId}. You have tools to prepare and execute Hedera transactions, or to provide transaction bytes.\n` +
    `When using tools, provide all necessary parameters clearly to make the transaction valid (e.g., for HBAR transfers, ensure debits and credits sum to zero. If the user asks to transfer from *their* account, like ${
      userAccountId || 'a user-specified account'
    }, make sure the debit in the transfer list correctly reflects that account).\n` +
    `If the user explicitly asks for "transaction bytes", "bytes to sign", or says they "want to sign it myself" (especially if they mention it's from *their* account like ${
      userAccountId || 'a user-specified account'
    }), your tool call MUST include the metaOption 'returnBytes: true'. When you provide these bytes, clearly state that the demo script will help the user sign these with their own account if they wish.\n` +
    `Otherwise, if the user asks you to perform an action (e.g., "transfer HBAR", "create a topic") and does NOT ask for bytes, execute the transaction directly; your account ${operatorId} will pay.\n` +
    `Be concise in your responses. When providing bytes as a result of a tool call, ensure the output is the structured JSON containing the 'transactionBytes' field.`;

  if (userAccountId) {
    systemMessage += `The user also has a personal account ID: ${userAccountId}. If they ask to perform a transaction from THEIR account (e.g., "transfer HBAR from my account ${userAccountId}") AND explicitly ask for bytes to sign, use the appropriate tool with 'returnBytes: true'. The demo script will then guide them to sign these bytes with their account ${userAccountId}.\n`;
  }
  systemMessage += 'Be concise in your responses.';

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemMessage],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  const agent = await createOpenAIToolsAgent({ llm, tools, prompt });
  const agentExecutor = new AgentExecutor({ agent, tools, verbose: false });
  console.log('LangChain agent and executor created. Type "exit" to quit.');

  const rl = createInterface();

  async function handleUserSignedExecution(transactionBytesBase64: string) {
    if (!userAccountId || !userPrivateKey) {
      console.log(
        'Agent > USER_ACCOUNT_ID and USER_PRIVATE_KEY are not set in .env file. User cannot sign.'
      );
      chatHistory.push(
        new AIMessage(
          'User keys not configured in .env, so I cannot proceed with user signing.'
        )
      );
      return;
    }

    console.log(
      `Agent > Attempting to prepare and execute transaction with user account ${userAccountId}...`
    );
    try {
      const userSigner = new ServerSigner(
        userAccountId,
        userPrivateKey,
        network
      );
      const txBytes = Buffer.from(
        transactionBytesBase64.replace(/`/g, '').trim(),
        'base64'
      );
      let transaction = Transaction.fromBytes(txBytes);

      const frozenTx = await transaction.freezeWith(userSigner.getClient());
      const signedTx = await frozenTx.sign(userSigner.getOperatorPrivateKey());
      const response = await signedTx.execute(userSigner.getClient());
      const receipt = await response.getReceipt(userSigner.getClient());

      console.log(
        'Agent > Transaction executed with your key. Receipt:',
        JSON.stringify(receipt.toJSON())
      );
      chatHistory.push(
        new AIMessage(
          `Transaction executed with your key. Receipt: ${JSON.stringify(
            receipt.toJSON()
          )}`
        )
      );
    } catch (e: any) {
      console.error('Agent > Error executing transaction with user key:', e);
      chatHistory.push(
        new AIMessage(
          `Sorry, I encountered an error executing that with your key: ${
            e.message || String(e)
          }`
        )
      );
    }
  }

  function askQuestion() {
    rl.question('User > ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        console.log('\nInteractive demo finished.');
        return;
      }

      try {
        console.log(`\nInvoking agent with: "${input}"`);
        const result = await agentExecutor.invoke({
          input: input,
          chat_history: chatHistory,
        });

        let agentOutputContent = result.output;
        console.log('Agent > ', agentOutputContent);
        chatHistory.push(new HumanMessage(input));

        let transactionBytesFound: string | null = null;

        if (
          typeof agentOutputContent === 'object' &&
          agentOutputContent !== null
        ) {
          if ((agentOutputContent as any).transactionBytes) {
            transactionBytesFound = (agentOutputContent as any)
              .transactionBytes;

            const messageToLog =
              typeof result.output === 'string'
                ? result.output
                : JSON.stringify(result.output);
            chatHistory.push(new AIMessage(messageToLog));
          } else if ((agentOutputContent as any).receipt) {
            chatHistory.push(
              new AIMessage(
                `Transaction executed by agent. Receipt: ${JSON.stringify(
                  (agentOutputContent as any).receipt?.toJSON()
                )}`
              )
            );
          } else {
            chatHistory.push(new AIMessage(JSON.stringify(agentOutputContent)));
          }
        } else if (typeof agentOutputContent === 'string') {
          const byteMatch = agentOutputContent.match(
            /`{0,3}([A-Za-z0-9+/=]{20,})`{0,3}/
          );
          if (byteMatch && byteMatch[1]) {
            transactionBytesFound = byteMatch[1];
          }
          chatHistory.push(new AIMessage(agentOutputContent));
        }

        if (transactionBytesFound) {
          if (userAccountId && userPrivateKey) {
            const finalBytes = transactionBytesFound;
            rl.question(
              `Agent > Transaction bytes received. Do you want to sign and execute this transaction with YOUR account ${userAccountId}? (y/n): `,
              async (answer) => {
                if (answer.toLowerCase() === 'y') {
                  await handleUserSignedExecution(finalBytes);
                } else {
                  chatHistory.push(
                    new AIMessage('Okay, transaction not executed by user.')
                  );
                }
                askQuestion();
              }
            );
            return;
          } else {
            chatHistory.push(
              new AIMessage(
                'Transaction bytes were generated, but your user keys are not configured in .env to attempt signing.'
              )
            );
          }
        }
      } catch (e) {
        console.error('Error during agent invocation:', e);
        chatHistory.push(new HumanMessage(input));
        chatHistory.push(
          new AIMessage('Sorry, I encountered an error processing that.')
        );
      }
      askQuestion();
    });
  }
  askQuestion();
}

main().catch(console.error);
