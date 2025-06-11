# Hedera Agent Kit

![npm version](https://badgen.net/npm/v/@hashgraphonline/hedera-agent-kit)
![license](https://badgen.net/github/license/hedera-dev/hedera-agent-kit)
![build](https://badgen.net/github/checks/hedera-dev/hedera-agent-kit)

> Build Hedera-powered AI agents **in under a minute**.

---

## 🚀 60-Second Quick-Start

### 1 – Install
```bash
npm install @hashgraphonline/hedera-agent-kit           # or yarn / pnpm
```
<details>
<summary>Frontend (WalletConnect)</summary>

```bash
npm install @hashgraphonline/hashinal-wc
```
</details>

### 2 – Add Environment Variables
Create a `.env` next to your script:
```env
OPENAI_API_KEY=sk-...
HEDERA_ACCOUNT_ID=0.0.xxx
HEDERA_PRIVATE_KEY=302e020100300506032b6570...
HEDERA_NETWORK=testnet
```

### 3 – Minimal "Hello-Hedera"
```ts
import { ServerSigner, HederaConversationalAgent } from '@hashgraphonline/hedera-agent-kit';
import * as dotenv from 'dotenv';
dotenv.config();

(async () => {
  const signer = new ServerSigner(process.env.HEDERA_ACCOUNT_ID!, process.env.HEDERA_PRIVATE_KEY!, 'testnet');
  const agent  = new HederaConversationalAgent(signer, {
    openAIApiKey: process.env.OPENAI_API_KEY,
    operationalMode: 'autonomous'
  });
  await agent.initialize();
  const res = await agent.processMessage('What is my HBAR balance?');
  console.log(res.output);
})();
```

### 4 – Interactive Demos
```bash
# Autonomous (agent signs & pays)
npm run demo:auto
# Human-in-the-loop (user signs in wallet)
npm run demo:hitl  # Requires USER_ACCOUNT_ID and USER_PRIVATE_KEY env vars for human signer
```

---

## ✨ Key Features
- Conversational Hedera (chat-driven blockchain actions)
- Flexible transaction handling (Autonomous • Human-in-the-loop • Scheduled)
- Comprehensive toolset (HTS, HCS, HBAR, Accounts, Files, Contracts)
- Extensible plugin system
- Simplified @hashgraph/sdk interaction

---

## 🧠 Core Concepts
| Concept | Purpose |
|---------|---------|
| **`HederaConversationalAgent`** | High-level chat interface powered by an LLM + tools |
| **`HederaAgentKit`** | Core engine bundling tools & network clients |
| **Signers** | `ServerSigner` (backend / agent pays)<br>`BrowserSigner` (user wallet) |
| **Operational Modes** | `autonomous` (execute)<br>`human-in-the-loop` (return bytes)<br>`scheduled` (create schedule) |

> Legacy names (`directExecution`, `provideBytes`) are still accepted.

---

## 💬 Handling Conversations
### Processing a Prompt
```ts
type ChatEntry = { type: 'human' | 'ai'; content: string };
const chatHistory: ChatEntry[] = [];
const res = await agent.processMessage('Send 10 HBAR to 0.0.123', chatHistory);
```

### Response Types
- Text only
- `transactionBytes` → present to wallet / sign
- `scheduleId` → let user sign a `ScheduleSignTransaction`

### Chat-History Tips
* Keep an array of `{ type: 'human' | 'ai', content }` objects.
* Trim to the latest ~15 exchanges to avoid token limits.
* Add system messages for persistent context (e.g. user account).

<details>
<summary>📋 Full Flow Example</summary>

```ts
import { ServerSigner, HederaConversationalAgent } from '@hashgraphonline/hedera-agent-kit';
import prompts from 'prompts';

type ChatEntry = { type: 'human' | 'ai'; content: string };

(async () => {
  const signer = new ServerSigner(process.env.HEDERA_ACCOUNT_ID!, process.env.HEDERA_PRIVATE_KEY!, 'testnet');
  const agent  = new HederaConversationalAgent(signer, {
    openAIApiKey: process.env.OPENAI_API_KEY,
    operationalMode: 'human-in-the-loop'
  });
  await agent.initialize();

  const chatHistory: ChatEntry[] = [];

  while (true) {
    const { msg } = await prompts({ type: 'text', name: 'msg', message: 'You (exit to quit):' });
    if (!msg || msg.toLowerCase() === 'exit') break;

    chatHistory.push({ type: 'human', content: msg });

    const res = await agent.processMessage(msg, chatHistory);
    console.log('AI:', res.output);
    chatHistory.push({ type: 'ai', content: res.output });

    if (res.transactionBytes) {
      console.log('⚠️  Transaction bytes returned – present to wallet.');
    }
    if (res.scheduleId) {
      console.log('🗓  Scheduled TX ID:', res.scheduleId.toString());
    }

    if (chatHistory.length > 20) chatHistory.splice(0, chatHistory.length - 15);
  }
})();
```
</details>

---

## 🔧 Advanced Usage
| Topic | Summary |
|-------|---------|
| Using `HederaAgentKit` directly | Programmatic control with service builders |
| Tool Filtering | Whitelist / blacklist tools at runtime |
| Plugin System | Load custom tools from local dirs or npm packages |

<details>
<summary>Direct Kit Usage</summary>

```ts
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
  const kit = new HederaAgentKit(signer, undefined, 'directExecution');
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
</details>

<details>
<summary>Tool Filtering</summary>

```ts
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
</details>

<details>
<summary>Plugin Loading</summary>

```ts
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
    'directExecution'
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
</details>

---

## 🛠️ Available Tools
Service categories:
1. Account Management
2. HBAR Transfers
3. Token Service (HTS)
4. Consensus Service (HCS)
5. File Service
6. Smart Contracts

👉 See [docs/TOOLS.md](docs/TOOLS.md) for the full catalogue & usage examples.

---

## 🗺 Architecture Diagram
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

---

## 🌐 Related Projects & Patterns
- **[Agent-to-Agent (HCS-10)](https://github.com/hashgraph-online/standards-sdk/blob/main/demo/hcs-10/transact-agent.ts)** – autonomous agent workflows
- **[Standards SDK](https://github.com/hashgraph-online/standards-sdk)** – implementations of Hashgraph Online's HCS standards

---

## 🧑‍💻 Local Development & Contributing
```bash
git clone https://github.com/hedera-dev/hedera-agent-kit.git
cd hedera-agent-kit
npm install
cp .env.example .env   # add your keys
```
Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and sign your commits under the DCO.

---

## 📜 License
Apache 2.0
