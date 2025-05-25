if (typeof window === 'undefined') {
  (global as any).window = {};
}
if (typeof self === 'undefined') {
  (global as any).self = global;
}

import * as dotenv from 'dotenv';
dotenv.config();

import { ServerSigner } from '../src/signer/server-signer';
import {
  Transaction,
  ScheduleInfoQuery,
  ScheduleId as SDKScheduleId,
} from '@hashgraph/sdk';
import { Buffer } from 'buffer';
import * as readline from 'readline';
import {
  HederaConversationalAgent,
  AgentResponse,
} from '../src/agent/conversational-agent';
import { HelloWorldPlugin } from './hello-world-plugin';
import { IPlugin } from '@hashgraphonline/standards-agent-kit';
import { NetworkType } from '../../standards-sdk/src';

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function main() {
  console.log(
    'Starting Hedera Agent Kit Interactive LangChain Demo using HederaConversationalAgent...'
  );

  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_PRIVATE_KEY;
  const network = (process.env.HEDERA_NETWORK || 'testnet') as NetworkType;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const userAccountId = process.env.USER_ACCOUNT_ID;
  const userPrivateKey = process.env.USER_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error(
      'HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env'
    );
  }
  if (!openaiApiKey) {
    console.warn(
      'OPENAI_API_KEY is not explicitly checked here, ensure it is set for default LLM in ConversationalAgent.'
    );
  }

  console.log(`Using Agent Operator ID: ${operatorId} on ${network}`);
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

  const conversationalAgent = new HederaConversationalAgent(agentSigner, {
    operationalMode: 'provideBytes',
    userAccountId: userAccountId,
    verbose: false,
    openAIApiKey: openaiApiKey,
    scheduleUserTransactionsInBytesMode: true,
    pluginConfig: {
      plugins: [new HelloWorldPlugin() as IPlugin],
    },
  });

  await conversationalAgent.initialize();
  console.log(
    'HederaConversationalAgent initialized. Type "exit" to quit, or try "say hello to Hedera".'
  );

  const chatHistory: Array<{ type: 'human' | 'ai'; content: string }> = [];
  const rl = createInterface();

  async function handleUserSignedExecution(
    transactionBytesBase64: string,
    originalPromptForHistory?: string
  ) {
    if (!userAccountId || !userPrivateKey) {
      console.log(
        'Agent > USER_ACCOUNT_ID and USER_PRIVATE_KEY are not set. Cannot execute with user key.'
      );
      chatHistory.push({
        type: 'ai',
        content: 'User keys not configured, cannot proceed with user signing.',
      });
      return;
    }
    if (originalPromptForHistory)
      chatHistory.push({ type: 'human', content: originalPromptForHistory });

    console.log(
      `Agent > Preparing and executing transaction with user account ${userAccountId}...`
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

      // Always attempt to freeze and sign with the user's key for this demo.
      // If the transaction was already frozen (e.g., a ScheduleSign prepared by the agent),
      // freezeWith() on an already frozen tx might be a no-op or error depending on SDK version/state.
      // For simplicity, we assume transaction from bytes needs user signature and payment.
      let frozenTx;
      if (transaction.isFrozen()) {
        frozenTx = transaction;
      } else {
        frozenTx = await transaction.freezeWith(userSigner.getClient());
      }
      const signedTx = await frozenTx.sign(userSigner.getOperatorPrivateKey());

      const response = await signedTx.execute(userSigner.getClient());
      const receipt = await response.getReceipt(userSigner.getClient());

      const successMsg = `Transaction executed with your key. Receipt: ${JSON.stringify(
        receipt.toJSON()
      )}`;
      console.log('Agent > ', successMsg);
      chatHistory.push({ type: 'ai', content: successMsg });
    } catch (e: any) {
      const errorMsg = `Sorry, I encountered an error executing that with your key: ${
        e.message || String(e)
      }`;
      console.error('Agent > Error executing transaction with user key:', e);
      chatHistory.push({ type: 'ai', content: errorMsg });
    }
  }

  async function processAndRespond(
    userInput: string,
    isFollowUp: boolean = false
  ) {
    if (!isFollowUp) {
      chatHistory.push({ type: 'human', content: userInput });
    }

    const agentResponse: AgentResponse =
      await conversationalAgent.processMessage(userInput, chatHistory);

    if (agentResponse.notes) {
      console.log('Agent Notes > ', agentResponse.notes.map(note => `- ${note}`).join('\n'));
    }

    console.log('Agent Message > ', agentResponse.message);
    if (agentResponse.output !== agentResponse.message) {
      console.log('Agent Tool Output (JSON) > ', agentResponse.output);
    }
    chatHistory.push({
      type: 'ai',
      content: agentResponse.message || agentResponse.output,
    });

    if (agentResponse.scheduleId) {
      const scheduleIdToSign = agentResponse.scheduleId;
      rl.question(
        `Agent > Transaction scheduled with ID ${scheduleIdToSign}. Sign and submit with your account ${userAccountId}? (y/n): `,
        async (answer) => {
          if (answer.toLowerCase() === 'y') {
            const followUpInput = `Sign and submit scheduled transaction ${scheduleIdToSign}`;
            console.log(`\nUser (follow-up) > ${followUpInput}`);
            await processAndRespond(followUpInput, true);
          } else {
            chatHistory.push({
              type: 'ai',
              content: 'Okay, scheduled transaction not signed.',
            });
            askQuestion();
          }
        }
      );
      return;
    }

    if (agentResponse.transactionBytes) {
      if (userAccountId && userPrivateKey) {
        const finalBytes = agentResponse.transactionBytes;
        const originalPromptForHistory = isFollowUp ? undefined : userInput;
        rl.question(
          `Agent > Transaction bytes received. Sign and execute with YOUR account ${userAccountId}? (y/n): `,
          async (answer) => {
            if (answer.toLowerCase() === 'y') {
              await handleUserSignedExecution(
                finalBytes,
                originalPromptForHistory
              );
            } else {
              chatHistory.push({
                type: 'ai',
                content: 'Okay, transaction not executed.',
              });
            }
            askQuestion();
          }
        );
        return;
      }
    }

    if (agentResponse.error) {
      console.error('Agent > Error reported by agent:', agentResponse.error);
    }
    askQuestion();
  }

  function askQuestion() {
    setTimeout(() => {
      rl.question('User > ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        console.log('\nInteractive demo finished.');
        return;
      }
      try {
        console.log(`\nInvoking agent with: "${input}"`);
        await processAndRespond(input);
      } catch (e: any) {
        const errorMsg = e.message || String(e);
        console.error('Error during agent invocation loop:', errorMsg);
        if (
          chatHistory[chatHistory.length - 1]?.content !== input ||
          chatHistory[chatHistory.length - 1]?.type !== 'human'
        ) {
          chatHistory.push({ type: 'human', content: input });
        }
        chatHistory.push({
          type: 'ai',
          content: `Sorry, a critical error occurred: ${errorMsg}`,
        });
        askQuestion();
      }
    });
    }, 100);
  }
  askQuestion();
}

main().catch(console.error);
