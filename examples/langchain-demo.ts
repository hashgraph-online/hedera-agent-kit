if (typeof window === 'undefined') {
  (global as any).window = {};
}
if (typeof self === 'undefined') {
  (global as any).self = global;
}

import * as dotenv from 'dotenv';
dotenv.config();

import { ServerSigner } from '../src/signer/server-signer';
import { HederaNetworkType } from '../src/signer/abstract-signer';
import { Transaction } from '@hashgraph/sdk';
import { Buffer } from 'buffer';
import * as readline from 'readline';
import { HederaConversationalAgent, AgentResponse } from '../src/agent/conversational-agent';
import { HelloWorldPlugin } from './hello-world-plugin';
import { IPlugin } from '@hashgraphonline/standards-agent-kit';

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function main() {
  console.log('Starting Hedera Agent Kit Interactive LangChain Demo using HederaConversationalAgent...');

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
    console.warn('OPENAI_API_KEY is not explicitly checked here, ensure it is set for default LLM in ConversationalAgent.');
  }

  console.log(
    `Using Agent Operator ID: ${operatorId} on ${network}`
  );
  if (userAccountId && userPrivateKey) {
    console.log(
      `User Account ID (for user-signed transactions): ${userAccountId} is configured.`
    );
  } else {
    console.warn(
      'USER_ACCOUNT_ID and/or USER_PRIVATE_KEY are not set in .env. User-signed execution will not be available.'
    );
  }

  const agentSigner = new ServerSigner(operatorId, operatorKey, network);

  const helloPluginInstance = new HelloWorldPlugin();

  const conversationalAgent = new HederaConversationalAgent(agentSigner, {
    operationalMode: 'provideBytes',
    userAccountId: userAccountId,
    verbose: false,
    openAIApiKey: openaiApiKey,
    scheduleUserTransactionsInBytesMode: false,
    pluginConfig: {
      plugins: [helloPluginInstance as IPlugin],
    }
  });

  await conversationalAgent.initialize();
  console.log('HederaConversationalAgent initialized. Type "exit" to quit, or try "say hello to Hedera".');

  const chatHistory: Array<{ type: 'human' | 'ai'; content: string }> = [];
  const rl = createInterface();

  async function handleUserSignedExecution(transactionBytesBase64: string) {
    if (!userAccountId || !userPrivateKey) {
      console.log(
        'Agent > USER_ACCOUNT_ID and USER_PRIVATE_KEY are not set. Cannot execute with user key.'
      );
      chatHistory.push({type: 'ai', content: 'User keys not configured in .env, so I cannot proceed with user signing.'});
      return;
    }

    console.log(
      `Agent > Preparing and executing transaction with user account ${userAccountId}...`
    );
    try {
      const userSigner = new ServerSigner(userAccountId, userPrivateKey, network);
      const txBytes = Buffer.from(
        transactionBytesBase64.replace(/`/g, '').trim(),
        'base64'
      );
      let transaction = Transaction.fromBytes(txBytes);

      const frozenTx = await transaction.freezeWith(userSigner.getClient());
      const signedTx = await frozenTx.sign(userSigner.getOperatorPrivateKey());
      const response = await signedTx.execute(userSigner.getClient());
      const receipt = await response.getReceipt(userSigner.getClient());

      const successMsg = `Transaction executed with your key. Receipt: ${JSON.stringify(receipt.toJSON())}`;
      console.log('Agent > ', successMsg);
      chatHistory.push({type: 'ai', content: successMsg});
    } catch (e: any) {
      const errorMsg = `Sorry, I encountered an error executing that with your key: ${e.message || String(e)}`;
      console.error('Agent > Error executing transaction with user key:', e);
      chatHistory.push({type: 'ai', content: errorMsg});
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
        chatHistory.push({type: 'human', content: input});

        const agentResponse: AgentResponse = await conversationalAgent.processMessage(input, chatHistory);

        console.log('Agent > ', agentResponse.output);
        chatHistory.push({type: 'ai', content: agentResponse.output});

        if (agentResponse.transactionBytes) {
            if (userAccountId && userPrivateKey) {
                const finalBytes = agentResponse.transactionBytes;
                rl.question(`Agent > Transaction bytes received. Do you want to sign and execute this with YOUR account ${userAccountId}? (y/n): `, async (answer) => {
                    if (answer.toLowerCase() === 'y') {
                        await handleUserSignedExecution(finalBytes);
                    } else {
                        chatHistory.push({type: 'ai', content: 'Okay, transaction not executed by user.'});
                    }
                    askQuestion();
                });
                return;
            } else {
                chatHistory.push({type: 'ai', content: 'Transaction bytes were generated, but your user keys are not configured in .env to attempt signing.'});
            }
        } else if (agentResponse.error) {
            console.error('Agent > Error reported by agent:', agentResponse.error);
        }

      } catch (e:any) {
        const errorMsg = e.message || String(e);
        console.error('Error during agent invocation loop:', errorMsg);
        chatHistory.push({type: 'human', content: input});
        chatHistory.push({type: 'ai', content: `Sorry, a critical error occurred: ${errorMsg}`});
      }
      askQuestion();
    });
  }
  askQuestion();
}

main().catch(console.error);
