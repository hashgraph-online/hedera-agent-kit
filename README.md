# Hedera Agent Kit

![npm version](https://badgen.net/npm/v/@hashgraphonline/hedera-agent-kit)
![license](https://badgen.net/github/license/hedera-dev/hedera-agent-kit)
![build](https://badgen.net/github/checks/hedera-dev/hedera-agent-kit)

Build Hedera powered AI agents **in under a minute**.

## 🚀 60-Second Quick Start

### 1. Install & Prerequisites

```bash
npm install @hashgraphonline/hedera-agent-kit
# or
yarn add @hashgraphonline/hedera-agent-kit
```

<details>
<summary>For frontend integration with WalletConnect</summary>

```bash
npm install @hashgraphonline/hashinal-wc
# or
yarn add @hashgraphonline/hashinal-wc
```
</details>
<br>

> Prerequisites: Node ≥ 18, an OpenAI API key, and a Hedera *testnet* account + private key (grab one free at the [Hedera Portal](https://portal.hedera.com/register>)).

### 2. Add your env vars

Create a `.env` file next to your script:

```env
OPENAI_API_KEY=sk-...
HEDERA_ACCOUNT_ID=0.0.xxx
HEDERA_PRIVATE_KEY=302e020100300506032b6570...
HEDERA_NETWORK=testnet
```

### 3. Run the example

```ts
import { ServerSigner, HederaConversationalAgent } from '@hashgraphonline/hedera-agent-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const main = async () => {
    // setting up the agent
    const signer = new ServerSigner(process.env.HEDERA_ACCOUNT_ID!, process.env.HEDERA_PRIVATE_KEY!, 'testnet');
    const agent = new HederaConversationalAgent(signer, {
        openAIApiKey: process.env.OPENAI_API_KEY,
        operationalMode: 'autonomous'
    });
    await agent.initialize();

    const history: Array<{ type: 'human' | 'ai'; content: string }> = [];

    // function for processing user prompts and agent responses
    async function ask(prompt: string) {
        history.push({ type: 'human', content: prompt });
        const res = await agent.processMessage(prompt, history);
        history.push({ type: 'ai', content: res.message! });
        console.log(res.message);
    }

    await ask('What is my HBAR balance?');
}

main();
```

### 4. Interactive demos

To get hands on experience using the Hedera Agent Kit, clone the repo and run our interactive CLI demos.

```bash
git clone https://github.com/hedera-dev/hedera-agent-kit.git
cd hedera-agent-kit
npm install
cp .env.example .env   # edit with your keys
```

There are two operational modes:

- **Autonomous Mode**: Agent signs and pays itself (ideal for backend or bot scenarios).
- **Human-in-the-Loop**: Agent returns transaction bytes for the user to sign in their wallet (e.g., HashPack via WalletConnect).

#### Run the autonomous agent demo

```bash
npm run demo:auto            # Autonomous mode (agent signs)
```
#### Run the human-in-the-loop demo

Add another account and private key in .env to act as a mock user.

```bash
USER_ACCOUNT_ID=0.0.xxx
USER_PRIVATE_KEY=302e02...
```
Run the CLI demo.
```bash
npm run demo:hitl           # Human-in-the-loop mode (user signs)
```

---


## Key Features

- **Conversational Hedera**: Easily build chat-based interfaces for Hedera actions.
- **Flexible Transaction Handling**:
  - **Autonomous Mode**: Agent signs and pays itself (ideal for backend or bot scenarios).
  - **Human-in-the-Loop**: Agent returns transaction bytes for the user to sign in their wallet (e.g., HashPack via WalletConnect).
  - **Scheduled Transactions**: Built-in support for "human-in-the-loop" workflows, where AI prepares transactions for user review and approval.
- **Comprehensive Toolset**: Pre-built tools for HTS, HCS, HBAR transfers, account management, files, and smart contracts.
- **Extensible**: Add your own custom tools with the plugin system.
- **Simplified SDK Interaction**: Abstracts away much of the Hedera SDK boilerplate.

## Table of Contents

- [hedera-agent-kit]
  - [Key Features](#key-features)
  - [Table of Contents](#table-of-contents)
  - [Quick Start: Your First Conversational Hedera Agent](#quick-start-your-first-conversational-hedera-agent)
  - [Core Concepts](#core-concepts)
  - [Handling User Prompts](#handling-user-prompts)
    - [Processing User Prompts](#processing-user-prompts)
    - [Understanding Agent Responses](#understanding-agent-responses)
    - [Handling Different Response Types](#handling-different-response-types)
      - [1. Text-only Responses](#1-text-only-responses)
      - [2. Transaction Bytes (human-in-the-loop mode)](#2-transaction-bytes-human-in-the-loop-mode)
      - [3. Schedule IDs (scheduled transactions)](#3-schedule-ids-scheduled-transactions)
    - [Working with Chat History](#working-with-chat-history)
    - [Example: Complete Prompt Handling Flow](#example-complete-prompt-handling-flow)
      - [Scheduled Transaction Implementation](#scheduled-transaction-implementation)
  - [Available Tools](#available-tools)
    - [Account Management Tools](#account-management-tools)
    - [HBAR Transaction Tools](#hbar-transaction-tools)
    - [HTS Token Service Tools](#hts-token-service-tools)
    - [HCS Consensus Service Tools](#hcs-consensus-service-tools)
    - [File Service Tools](#file-service-tools)
    - [Smart Contract Service Tools](#smart-contract-service-tools)
  - [Advanced Usage](#advanced-usage)
    - [Using `HederaAgentKit` Directly](#using-hederaagentkit-directly)
    - [Tool Filtering](#tool-filtering)
    - [Plugin System](#plugin-system)
  - [API Reference](#api-reference)
    - [HederaConversationalAgent Options](#hederaconversationalagent-options)
  - [Architecture Diagram](#architecture-diagram)
  - [Local Development](#local-development)
  - [Related Projects and Advanced Patterns](#related-projects-and-advanced-patterns)
    - [Agent-to-Agent Communication](#agent-to-agent-communication)
    - [Standards SDK](#standards-sdk)
  - [Contributing](#contributing)
  - [License](#license)



_


**3. Example Interaction:**

```
User > Schedule a transfer of 0.1 HBAR from my account to 0.0.34567
Agent > Okay, I have scheduled a transfer of 0.1 HBAR from your account (0.0.USER_ACCOUNT_ID) to 0.0.34567. The Schedule ID is 0.0.xxxxxx.
Agent > Transaction bytes received. Do you want to sign and execute this with YOUR account 0.0.USER_ACCOUNT_ID? (y/n): y
Agent > Transaction executed with your key. Receipt: { ... }
```

**4. Demo Source Reference:**

The human-in-the-loop demo code is in `examples/human-in-the-loop-demo.ts`. Here is a simplified excerpt:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();
import { ServerSigner } from '@hashgraphonline/hedera-agent-kit';
import { HederaConversationalAgent } from '@hashgraphonline/hedera-agent-kit';

async function main() {
  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_PRIVATE_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const userAccountId = process.env.USER_ACCOUNT_ID;
  const userPrivateKey = process.env.USER_PRIVATE_KEY;

  if (!operatorId || !operatorKey)
    throw new Error(
      'HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env'
    );

  const agentSigner = new ServerSigner(operatorId, operatorKey, network);
  const conversationalAgent = new HederaConversationalAgent(agentSigner, {
    operationalMode: 'human-in-the-loop',
    userAccountId: userAccountId,
    verbose: false,
    openAIApiKey: openaiApiKey,
  });
  await conversationalAgent.initialize();
  // ... (see examples/langchain-demo.ts for full interactive loop)
}
main().catch(console.error);
```

## Core Concepts

Understanding these concepts will help you make the most of the Hedera Agent Kit:

> **Note on Operational Modes**: The operational mode names have been updated for clarity:
> - `'autonomous'` (previously `'directExecution'`): Agent executes transactions directly
> - `'human-in-the-loop'` (previously `'provideBytes'`): Agent prepares transactions for user signing
> 
> The old names (`'directExecution'` and `'provideBytes'`) are still supported for backward compatibility.

- **`HederaConversationalAgent`**: The primary interface for building chat-based applications. It combines the power of an LLM with the Hedera-specific tools provided by `HederaAgentKit`.
- **`HederaAgentKit`**: The core engine that bundles tools, manages network clients, and holds the `signer` configuration. It's used internally by `HederaConversationalAgent` but can also be used directly for more programmatic control.
- **Signers (`AbstractSigner`)**: Determine how transactions are signed and paid for:
  - `ServerSigner`: Holds a private key directly. Useful for backend agents where the agent's account pays for transactions it executes.
  - `BrowserSigner` (Conceptual for this README): Represents integrating with a user's browser wallet (e.g., HashPack). The agent prepares transaction bytes, and the user signs and submits them via their wallet.
- **Operational Modes**: Configure how the agent handles transactions:
  - `operationalMode: 'autonomous'` (legacy: `'directExecution'`): Agent signs and submits all transactions using its `signer`. The agent's operator account pays.
  - `operationalMode: 'human-in-the-loop'` (legacy: `'provideBytes'`): Agent returns transaction bytes. Your application (and the user, via their wallet) is responsible for signing and submitting. This is key for user-centric apps.
  - `scheduleUserTransactionsInBytesMode: boolean` (Default: `true`): When `operationalMode` is `'human-in-the-loop'` (or legacy `'provideBytes'`), this flag makes the agent automatically schedule transactions initiated by the user (e.g., "transfer _my_ HBAR..."). The agent's operator account pays to _create the schedule entity_, and the user pays for the _actual scheduled transaction` when they sign the `ScheduleSignTransaction`.
  - `metaOptions: { schedule: true }`: Allows the LLM to explicitly request scheduling for any tool call, overriding defaults.
- **Human-in-the-Loop Flow**: The Quick Start example demonstrates this. The agent first creates a schedule (agent pays). Then, after user confirmation, it prepares a `ScheduleSignTransaction` (user pays to sign and submit this, triggering the original scheduled transaction).

### Choosing Between Operational Modes

**Autonomous Agent Mode** (`operationalMode: 'autonomous'`)
- Best for: Backend services, autonomous agents, testing and development
- The agent's account signs and pays for all transactions
- Simpler implementation - no user interaction needed
- Try the demo: `npm run demo:auto`
- Example use cases: 
  - Automated trading bots
  - System maintenance tasks
  - Development/testing environments

```typescript
const agent = new HederaConversationalAgent(agentSigner, {
  operationalMode: 'autonomous',
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// User says: "Send 10 HBAR to 0.0.12345"
// Agent directly executes the transfer using its own account
```

**Human-in-the-Loop Mode** (`operationalMode: 'human-in-the-loop'`)
- Best for: User-facing applications, wallets, dApps
- Agent prepares transactions, users sign with their own accounts
- Maintains user custody of keys and funds
- Try the demo: `npm run demo:hitl`
- Example use cases:
  - Chat interfaces for wallet apps
  - DeFi application assistants
  - Any scenario where users should control their own funds

```typescript
const agent = new HederaConversationalAgent(agentSigner, {
  operationalMode: 'human-in-the-loop',
  userAccountId: userAccountId,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// User says: "Send 10 HBAR from my account to 0.0.12345"
// Agent returns transaction bytes for the user to sign
```

## Handling User Prompts

When building applications with `HederaConversationalAgent`, it's important to establish a proper flow for handling user prompts and agent responses. This section explains how to process user inputs, manage conversation history, and handle the various response types from the agent.

### Processing User Prompts

To send a user's message to the agent and receive a response:

```typescript
// Initialize the agent as shown in the Quick Start example
const conversationalAgent = new HederaConversationalAgent(agentSigner, {
  operationalMode: 'human-in-the-loop',
  userAccountId: userAccountId,
  openAIApiKey: openaiApiKey,
});
await conversationalAgent.initialize();

// Create a chat history array to maintain conversation context
const chatHistory: Array<{ type: 'human' | 'ai'; content: string }> = [];

// Process a user message
async function handleUserMessage(userInput: string) {
  // Add the user's message to chat history
  chatHistory.push({ type: 'human', content: userInput });

  // Process the message using the agent
  const agentResponse = await conversationalAgent.processMessage(
    userInput,
    chatHistory
  );

  // Add the agent's response to chat history
  chatHistory.push({ type: 'ai', content: agentResponse.output });

  // Return the full response to handle any transaction data
  return agentResponse;
}
```

### Understanding Agent Responses

The `processMessage` method returns an `AgentResponse` object with these key properties:

```typescript
interface AgentResponse {
  output: string; // The text response to show to the user
  transactionBytes?: string; // Base64-encoded transaction bytes (when in human-in-the-loop mode)
  scheduleId?: ScheduleId; // The schedule ID when a transaction was scheduled
  error?: string; // Error message if something went wrong
}
```

### Handling Different Response Types

Depending on your operational mode, you'll need to handle different response types:

#### 1. Text-only Responses

Simple informational responses require no special handling:

```typescript
const response = await handleUserMessage("What's my HBAR balance?");
console.log(response.output); // Display to the user
```

#### 2. Transaction Bytes (human-in-the-loop mode)

When the agent generates transaction bytes, you'll need to present them to the user for signing:

```typescript
const response = await handleUserMessage('Transfer 10 HBAR to 0.0.12345');

if (response.transactionBytes) {
  // Option 1: Using Hashinal WalletConnect SDK
  import { HashinalsWalletConnectSDK } from '@hashgraphonline/hashinal-wc';
  import { Transaction } from '@hashgraph/sdk';

  const sdk = HashinalsWalletConnectSDK.getInstance();
  await sdk.init(projectId, metadata);
  await sdk.connect();

  // Sign and submit the transaction
  const txBytes = Buffer.from(response.transactionBytes, 'base64');
  const transaction = Transaction.fromBytes(txBytes);
  const receipt = await sdk.executeTransaction(transaction);
  console.log('Transaction executed:', receipt);

  // Option 2: If you have the user's key in your app
  const userSigner = new ServerSigner(userAccountId, userPrivateKey, network);
  const txBytes = Buffer.from(response.transactionBytes, 'base64');
  const transaction = Transaction.fromBytes(txBytes);
  const signedTx = await transaction.sign(userSigner.getOperatorPrivateKey());
  const txResponse = await signedTx.execute(userSigner.getClient());
}
```

#### 3. Schedule IDs (scheduled transactions)

When the agent creates a scheduled transaction:

```typescript
const response = await handleUserMessage(
  'Schedule a transfer of 5 HBAR from my account to 0.0.12345'
);

if (response.scheduleId) {
  const scheduleIdStr = response.scheduleId.toString();
  console.log(`Transaction scheduled with ID: ${scheduleIdStr}`);

  // Ask the user if they want to sign the scheduled transaction
  const userWantsToSign = await askUserForConfirmation();

  if (userWantsToSign) {
    // Ask the agent to prepare the ScheduleSign transaction
    const signResponse = await handleUserMessage(
      `Sign the scheduled transaction with ID ${scheduleIdStr}`
    );

    // Handle the resulting transaction bytes as shown above
    if (signResponse.transactionBytes) {
      // Present to wallet or sign with user key
    }
  }
}
```

### Working with Chat History

The chat history is crucial for giving the agent context of the conversation. Some best practices:

1. **Format**: Each entry should have a `type` ('human' or 'ai') and `content` (string).
2. **Memory Management**: Limit history length to avoid token limits:

```typescript
// Trim history if it gets too long
if (chatHistory.length > 20) {
  // Keep the most recent 15 messages
  chatHistory.splice(0, chatHistory.length - 15);
}
```

3. **Preserving Context**: For better results, make sure to include important context:

```typescript
// Special initialization message to set context
chatHistory.push({
  type: 'system',
  content: 'The user's account ID is 0.0.12345. They are interested in NFTs.'
});
```

### Example: Complete Prompt Handling Flow

Here's a complete example bringing all the concepts together:

```typescript
async function handleHederaConversation() {
  // Initialize agent
  const agent = new HederaConversationalAgent(agentSigner, {
    operationalMode: 'human-in-the-loop',
    userAccountId: userAccountId,
    openAIApiKey: openaiApiKey,
  });
  await agent.initialize();

  const chatHistory = [];

  // Initialize with context
  chatHistory.push({
    type: 'system',
    content: `User account: ${userAccountId}. Network: ${network}.`,
  });

  // Simulated chat loop
  while (true) {
    const userInput = await getUserInput(); // Your UI input function
    if (userInput.toLowerCase() === 'exit') break;

    chatHistory.push({ type: 'human', content: userInput });

    const response = await agent.processMessage(userInput, chatHistory);
    displayToUser(response.output);
    chatHistory.push({ type: 'ai', content: response.output });

    // Handle special responses
    if (response.transactionBytes) {
      const shouldSign = await askUserToSign();
      if (shouldSign) {
        await signAndSubmitTransaction(response.transactionBytes);
      }
    }

    if (response.scheduleId) {
      displayToUser(
        `Transaction scheduled! ID: ${response.scheduleId.toString()}`
      );
      // Handle schedule signing if needed
    }

    // Trim history if needed
    if (chatHistory.length > 20) chatHistory.splice(0, chatHistory.length - 15);
  }
}
```

#### Scheduled Transaction Implementation

When working with scheduled transactions, you can check their status and handle approvals programmatically:

```typescript
import { HashinalsWalletConnectSDK } from '@hashgraphonline/hashinal-wc';
import { ScheduleSignTransaction } from '@hashgraph/sdk';
import {
  HederaMirrorNode,
  TransactionParser,
} from '@hashgraphonline/standards-sdk';

async function handleScheduledTransaction(
  scheduleId: string,
  network: 'mainnet' | 'testnet'
) {
  // Initialize WalletConnect SDK
  const sdk = HashinalsWalletConnectSDK.getInstance();
  await sdk.init(projectId, metadata);
  await sdk.connect();

  // Create mirror node instance
  const mirrorNode = new HederaMirrorNode(network);

  // Fetch schedule information
  const scheduleInfo = await mirrorNode.getScheduleInfo(scheduleId);

  if (!scheduleInfo) {
    throw new Error('Schedule not found');
  }

  // Check if already executed
  if (scheduleInfo.executed_timestamp) {
    console.log(
      'Transaction already executed at:',
      scheduleInfo.executed_timestamp
    );
    return { status: 'executed', timestamp: scheduleInfo.executed_timestamp };
  }

  // Parse transaction details
  const transactionDetails = TransactionParser.parseScheduleResponse({
    transaction_body: scheduleInfo.transaction_body,
    memo: scheduleInfo.memo,
  });

  console.log('Transaction Details:', {
    type: transactionDetails.humanReadableType,
    transfers: transactionDetails.transfers,
    memo: transactionDetails.memo,
    expirationTime: scheduleInfo.expiration_time,
  });

  // Create and execute the ScheduleSign transaction
  const scheduleSignTx = new ScheduleSignTransaction().setScheduleId(
    scheduleId
  );

  try {
    // For scheduled transactions, disable signer since it's already configured
    const receipt = await sdk.executeTransaction(scheduleSignTx, false);
    console.log('Schedule signed successfully:', receipt);
    return { status: 'signed', receipt };
  } catch (error) {
    console.error('Failed to sign schedule:', error);
    throw error;
  }
}

// Usage with HederaConversationalAgent
async function exampleScheduledTransactionFlow() {
  const agent = new HederaConversationalAgent(agentSigner, {
    operationalMode: 'human-in-the-loop',
    userAccountId: userAccountId,
    scheduleUserTransactionsInBytesMode: true, // Auto-schedule user transactions
  });

  // User requests a scheduled transaction
  const response = await agent.processMessage(
    'Schedule a transfer of 10 HBAR from my account to 0.0.12345 for tomorrow'
  );

  if (response.scheduleId) {
    console.log(
      'Transaction scheduled with ID:',
      response.scheduleId.toString()
    );

    // Handle the scheduled transaction approval
    const result = await handleScheduledTransaction(
      response.scheduleId.toString(),
      'testnet'
    );

    console.log('Schedule handling result:', result);
  }
}

// Polling example - check schedule status periodically
async function pollScheduleStatus(
  scheduleId: string,
  network: 'mainnet' | 'testnet'
) {
  const mirrorNode = new HederaMirrorNode(network);

  const checkStatus = async () => {
    const scheduleInfo = await mirrorNode.getScheduleInfo(scheduleId);

    if (scheduleInfo?.executed_timestamp) {
      console.log('Schedule executed!');
      clearInterval(intervalId);

      // Get the executed transaction details
      const executedTx = await mirrorNode.getTransactionByTimestamp(
        scheduleInfo.executed_timestamp
      );
      console.log('Executed transaction:', executedTx);
    } else if (scheduleInfo?.deleted_timestamp) {
      console.log('Schedule was deleted');
      clearInterval(intervalId);
    } else {
      console.log('Schedule still pending...');
    }
  };

  // Check immediately and then every 5 seconds
  await checkStatus();
  const intervalId = setInterval(checkStatus, 5000);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
```

## Available Tools

The Hedera Agent Kit provides a comprehensive set of tools organized by service type. These tools can be used both by the conversational agent and programmatically.

For a complete list of all available tools with descriptions and usage examples, see **[docs/TOOLS.md](docs/TOOLS.md)**.

The tools are organized into the following categories:
- **Account Management Tools** - Create, update, delete accounts, manage allowances
- **HBAR Transaction Tools** - Transfer HBAR and check balances  
- **HTS Token Service Tools** - Create, mint, transfer, and manage fungible tokens and NFTs
- **HCS Consensus Service Tools** - Create topics and submit consensus messages
- **File Service Tools** - Create, update, and manage files on Hedera
- **Smart Contract Service Tools** - Deploy and interact with smart contracts

## Advanced Usage

### Using `HederaAgentKit` Directly

For more programmatic control, you can use `HederaAgentKit` directly instead of the conversational agent:

```typescript
import {
  HederaAgentKit,
  ServerSigner,
} from '@hashgraphonline/hedera-agent-kit';
import { Hbar } from '@hashgraph/sdk';

async function useKitDirectly() {
  const signer = new ServerSigner(
    process.env.HEDERA_ACCOUNT_ID!,
    process.env.HEDERA_PRIVATE_KEY!,
    'testnet'
  );
  const kit = new HederaAgentKit(signer, undefined, 'autonomous');
  await kit.initialize();

  // Transfer HBAR
  const transferResult = await kit
    .accounts()
    .transferHbar({
      transfers: [
        { accountId: '0.0.RECIPIENT', amount: new Hbar(1) },
        { accountId: signer.getAccountId().toString(), amount: new Hbar(-1) },
      ],
      memo: 'Direct kit HBAR transfer',
    })
    .execute();
  console.log('Transfer result:', transferResult);

  // Create a token
  const createTokenResult = await kit
    .hts()
    .createFungibleToken({
      name: 'My Token',
      symbol: 'TKN',
      decimals: 2,
      initialSupply: 1000,
      maxSupply: 10000,
      memo: 'My first token',
    })
    .execute();
  console.log('Token created:', createTokenResult);
}
```

### Tool Filtering

You can control which tools are available to the conversational agent by providing a `toolFilter` function. This is useful when you want to:
- Limit the agent's capabilities for security reasons
- Create specialized agents focused on specific tasks
- Implement role-based access control
- Reduce the token count sent to the LLM by filtering out unnecessary tools

```typescript
import { HederaConversationalAgent } from '@hashgraphonline/hedera-agent-kit';
import { StructuredTool } from '@langchain/core/tools';

// Example 1: Allow only read operations (no state changes)
const readOnlyAgent = new HederaConversationalAgent(agentSigner, {
  openAIApiKey: process.env.OPENAI_API_KEY,
  toolFilter: (tool: StructuredTool) => {
    const readOnlyTools = [
      'get-', 
      'query', 
      'account-balance',
      'account-info',
      'topic-info',
      'token-info'
    ];
    return readOnlyTools.some(pattern => tool.name.includes(pattern));
  }
});

// Example 2: Disable specific high-risk operations
const restrictedAgent = new HederaConversationalAgent(agentSigner, {
  openAIApiKey: process.env.OPENAI_API_KEY,
  toolFilter: (tool: StructuredTool) => {
    const blockedTools = [
      'hedera-account-delete',
      'hedera-hts-wipe-token-account',
      'hedera-hts-burn-nft',
      'hedera-delete-contract'
    ];
    return !blockedTools.includes(tool.name);
  }
});

// Example 3: Create an NFT-focused agent
const nftAgent = new HederaConversationalAgent(agentSigner, {
  openAIApiKey: process.env.OPENAI_API_KEY,
  userAccountId: userAccountId,
  toolFilter: (tool: StructuredTool) => {
    const nftTools = [
      'hedera-hts-create-nft',
      'hedera-hts-mint-nft',
      'hedera-hts-transfer-nft',
      'hedera-hts-burn-nft',
      'hedera-hts-associate-token',
      'hedera-account-get-nfts',
      'hedera-account-transfer-hbar', // For paying fees
      'hedera-account-get-balance'
    ];
    return nftTools.includes(tool.name);
  }
});

// Example 4: Dynamic filtering based on user roles
async function createRoleBasedAgent(userRole: 'admin' | 'user' | 'viewer') {
  const agent = new HederaConversationalAgent(agentSigner, {
    openAIApiKey: process.env.OPENAI_API_KEY,
    toolFilter: (tool: StructuredTool) => {
      switch (userRole) {
        case 'viewer':
          // Only allow read operations
          return tool.name.includes('get-') || tool.name.includes('query');
        case 'user':
          // Allow most operations except account management
          return !tool.name.includes('account-delete') && 
                 !tool.name.includes('account-create');
        case 'admin':
          // Allow all tools
          return true;
        default:
          return false;
      }
    }
  });
  
  await agent.initialize();
  return agent;
}
```

### Plugin System

Extend the agent's capabilities with custom plugins:

```typescript
import {
  HederaAgentKit,
  ServerSigner,
} from '@hashgraphonline/hedera-agent-kit';

async function useCustomPlugin() {
  const signer = new ServerSigner(
    process.env.HEDERA_ACCOUNT_ID!,
    process.env.HEDERA_PRIVATE_KEY!,
    'testnet'
  );

  // Create the kit with plugin configuration
  const kit = new HederaAgentKit(
    signer,
    {
      directories: ['./plugins'], // Local plugin directory
      packages: ['@my-org/my-hedera-plugin'], // NPM package plugin
      appConfig: { customSetting: 'value' }, // Custom config passed to plugins
    },
    'autonomous'
  );

  await kit.initialize();

  // Now the kit has all your plugin tools available
  const tools = kit.getAggregatedLangChainTools();
  console.log(
    'Available tools including plugins:',
    tools.map((t) => t.name)
  );
}
```

## API Reference

### HederaConversationalAgent Options

```typescript
interface HederaConversationalAgentOptions {
  // LLM Configuration
  llm?: BaseChatModel; // Provide your own LLM instance
  openAIApiKey?: string; // Or provide just the API key

  // Agent Configuration
  userAccountId?: string; // User's account ID for user-centric operations
  operationalMode?: AgentOperationalMode; // 'autonomous' or 'human-in-the-loop' (legacy: 'directExecution' or 'provideBytes')
  scheduleUserTransactionsInBytesMode?: boolean; // Auto-schedule user transactions

  // Plugin Configuration
  pluginConfig?: PluginConfig; // Configure plugins

  // Tool Filtering
  toolFilter?: (tool: StructuredTool) => boolean; // Filter which tools are available to the agent

  // Debug Options
  verbose?: boolean; // Enable verbose logging
  disableLogging?: boolean; // Disable all logging output
}
```

## Architecture Diagram

```mermaid
graph TD;
    UserInput["User via Application UI"] --> AppCode["Application Logic (e.g., demo.ts)"];
    AppCode -- "Sends user prompt to" --> ConversationalAgent["HederaConversationalAgent"];

    subgraph AgentCore ["HederaConversationalAgent Internals"]
        ConversationalAgent -- "Manages" --> LLM["LLM (e.g., GPT-4o)"];
        ConversationalAgent -- "Uses" --> AgentKit["HederaAgentKit Instance"];
        LLM -- "Decides to use a tool" --> Tools[Aggregated LangChain Tools];
    end

    AgentKit -- "Provides tools to" --> Tools;
    AgentKit -- "Configured with" --> Signer["AbstractSigner (ServerSigner/BrowserSigner)"];
    AgentKit -- "Configured with" --> OpModes["Operational Modes"];

    Tools -- "Calls e.g., kit.accounts()" --> AgentKit;
    Tools -- "Invokes e.g., accountBuilder.prepareTransferHbar()" --> ServiceBuilders["Service Builders (AccountBuilder, etc.)"];
    ServiceBuilders -- "Prepares SDK Transaction" --> SDKTx["@hashgraph/sdk Transaction"];

    subgraph ExecutionPath ["Transaction Execution / Byte Generation"]
        ServiceBuilders -- "Based on OpModes & Tool Logic" --> DecisionPoint["Execute or GetBytes?"];
        DecisionPoint -- "Execute (Agent Pays/Signs via ServerSigner)" --> Signer;
        DecisionPoint -- "HumanInLoop (User Pays/Signs)" --> TxBytes["Transaction Bytes"];
        DecisionPoint -- "Schedule (Agent Pays for CreateSchedule)" --> Signer;
        TxBytes -- "Returned to AppCode --> User Wallet" --> UserWallet["User Wallet (HashPack, etc)"];
        Signer -- "Uses SDK Client" --> HederaNetwork["Hedera Network"];
        UserWallet -- "Submits to" --> HederaNetwork;
    end
```

## Local Development

1. **Clone** the repo:

```bash
git clone https://github.com/hedera-dev/hedera-agent-kit.git
```

2. Install dependencies:

```bash
cd hedera-agent-kit
npm install
```

3. Configure environment variables (e.g., `OPENAI_API_KEY`, `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`) in a `.env` file based on the `sample.env` template.

4. Test the kit:

```bash
npm run test
```

5. Run the demo:

```bash
npm run demo:langchain
```

## Related Projects and Advanced Patterns

### Agent-to-Agent Communication

While this kit focuses on user-to-agent interactions, the HCS-10 OpenConvAI standard enables autonomous agent-to-agent communication on Hedera. HCS-10 defines protocols for:

- AI agents discovering and connecting with each other
- Approval-required transaction workflows between agents
- Decentralized AI agent marketplaces

For implementation examples, see [@standards-sdk/demo/hcs-10/transact-agent.ts](https://github.com/hashgraph-online/standards-sdk/blob/main/demo/hcs-10/transact-agent.ts).

### Standards SDK

The [@hashgraphonline/standards-sdk](https://github.com/hashgraph-online/standards-sdk) provides implementations of various Hedera standards including HCS-1 through HCS-11, useful for building more complex decentralized applications.

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](https://github.com/hedera-dev/hedera-agent-kit/blob/main/CONTRIBUTING.md) for details on our process, how to get started, and how to sign your commits under the DCO.

## License

Apache 2.0

</details>
