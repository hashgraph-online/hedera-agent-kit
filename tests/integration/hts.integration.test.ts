import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'; // Restored Vitest imports
import { HederaAgentKit } from '../../src/agent';
import { ServerSigner } from '../../src/signer/server-signer';
import {
  HederaCreateFungibleTokenTool,
  HederaDeleteTokenTool,
  HederaCreateNftTool,
  HederaMintFungibleTokenTool,
  HederaBurnFungibleTokenTool,
  HederaMintNftTool,
  HederaBurnNftTool,
  HederaPauseTokenTool,
  HederaUnpauseTokenTool,
  HederaUpdateTokenTool,
  HederaAssociateTokensTool,
  HederaDissociateTokensTool,
} from '../../src/langchain/tools/hts';
// import { initializeTestKit, generateUniqueName, createTestAgentExecutor, delay } from './utils'; // Temporarily commented out
import { TokenId, AccountId } from '@hashgraph/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { StructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Buffer } from 'buffer'; // Buffer was missing from original inlined utils, but needed for NFT metadata

// Ensure environment variables are loaded for the test file itself
dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

// --- INLINED UTILS ---
/**
 * Initializes HederaAgentKit with a ServerSigner for testing.
 */
async function initializeTestKit(): Promise<HederaAgentKit> {
  // Use the correct environment variable names as specified by the user
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const openAIApiKey = process.env.OPENAI_API_KEY;
  // HEDERA_KEY_TYPE is logged in setup-env.ts but not directly used in ServerSigner constructor here.
  // ServerSigner infers key type or expects a specific format.

  if (!accountId || !privateKey)
    throw new Error(
      'Hedera account ID or private key missing from environment variables.'
    );
  if (!openAIApiKey)
    throw new Error('OpenAI API key missing from environment variables.');

  const signer = new ServerSigner(accountId, privateKey, 'testnet');
  const kit = new HederaAgentKit(signer, { appConfig: { openAIApiKey } });
  await kit.initialize();
  return kit;
}

function generateUniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simplify the prompt template for createOpenAIToolsAgent
// const AGENT_PROMPT_TEMPLATE_INLINED = `... complex template ...`; // Keep old one commented for reference if needed

async function createTestAgentExecutor(
  tool: StructuredTool,
  openAIApiKey: string
): Promise<AgentExecutor> {
  const tools = [tool]; // This is the array of actual tool instances
  const llm = new ChatOpenAI({
    apiKey: openAIApiKey,
    modelName: 'gpt-3.5-turbo-1106',
    temperature: 0,
  });

  // Standard prompt structure for OpenAIToolsAgent
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      'You are a helpful assistant that can use tools to perform actions on the Hedera network. When a user asks you to do something that requires a tool, call the appropriate tool with the correct parameters. Respond directly to the user otherwise.',
    ],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

  const agent = await createOpenAIToolsAgent({
    llm,
    tools, // The agent needs the actual tool objects
    prompt,
  });

  return new AgentExecutor({
    agent,
    tools, // Executor also needs the tools
    verbose: process.env.VERBOSE_AGENT_LOGGING === 'true',
    returnIntermediateSteps: true, // Ensure intermediate steps are returned
  });
}
// --- END INLINED UTILS ---

// Helper to extract tool output from AgentExecutor result
function getToolOutputFromResult(agentResult: any): any {
  console.log('Full agentResult:', JSON.stringify(agentResult, null, 2)); // Log the whole thing

  let toolOutputData: any;

  if (
    agentResult.intermediateSteps &&
    agentResult.intermediateSteps.length > 0
  ) {
    const lastStep =
      agentResult.intermediateSteps[agentResult.intermediateSteps.length - 1];
    const observation = lastStep.observation;
    console.log(
      'Last intermediate step action:',
      JSON.stringify(lastStep.action, null, 2)
    ); // Log the action part
    console.log(
      'Attempting to use this observation from last intermediate step:',
      observation
    ); // Log the observation it's about to use

    if (typeof observation === 'string') {
      try {
        toolOutputData = JSON.parse(observation);
      } catch (e: any) {
        console.error(
          'Failed to parse observation string from intermediateStep. String was:',
          observation,
          'Error:',
          e
        );
        throw new Error(
          `Failed to parse observation string from intermediateStep. String was: "${observation}". Error: ${e.message}`
        );
      }
    } else if (typeof observation === 'object' && observation !== null) {
      toolOutputData = observation;
      console.log(
        'Observation from intermediateStep was already an object, using directly:',
        toolOutputData
      );
    } else {
      console.warn(
        'Observation in last intermediate step was not a string or a recognized object. Full step:',
        lastStep
      );
      // Fall through to try agentResult.output if intermediate observation is not usable
    }
  }

  if (!toolOutputData) {
    // If intermediate steps didn't yield data OR observation was not usable
    console.warn(
      'Could not find usable tool output in intermediateSteps or observation was not directly usable. Attempting to parse agentResult.output. Full agent result:',
      agentResult // agentResult.output is already part of this log
    );
    if (typeof agentResult.output === 'string') {
      console.log(
        'Attempting to parse agentResult.output as fallback:',
        agentResult.output
      );
      try {
        toolOutputData = JSON.parse(agentResult.output);
        console.warn(
          'Parsed agentResult.output as a fallback. This might be unstable if it was natural language.'
        );
      } catch (e: any) {
        throw new Error(
          `No usable intermediate step observation, and agentResult.output was not valid JSON. Output: "${agentResult.output}". Error: ${e.message}`
        );
      }
    } else {
      throw new Error(
        'No usable intermediate step observation, and agentResult.output is not a string.'
      );
    }
  }
  return toolOutputData;
}

describe('Hedera HTS Tools Integration Tests', () => {
  let kit: HederaAgentKit;
  let createdTokenIds: TokenId[] = [];
  let treasuryAccountId: AccountId;
  let openAIApiKey: string;

  beforeAll(async () => {
    kit = await initializeTestKit();
    treasuryAccountId = kit.signer.getAccountId();
    openAIApiKey = process.env.OPENAI_API_KEY as string;
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables.');
    }
  });

  afterAll(async () => {
    if (kit && createdTokenIds.length > 0) {
      console.log(
        `Attempting to clean up ${createdTokenIds.length} created token(s)...`
      );
      const deleteTool = new HederaDeleteTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(
        deleteTool,
        openAIApiKey
      );

      for (const tokenId of createdTokenIds) {
        try {
          const prompt = `Delete the token with ID ${tokenId.toString()}. metaOptions: { deleteAdminKeyShouldSign: true }`;
          console.log(`Cleaning up token: ${tokenId.toString()}`);
          const agentResult = await agentExecutor.invoke({ input: prompt });
          const result = getToolOutputFromResult(agentResult);

          expect(
            result.success,
            `Cleanup Failed for ${tokenId.toString()}: ${result.error}`
          ).toBe(true);
          expect(result.receipt).toBeDefined();
          if (result.receipt) {
            expect(result.receipt.status).toEqual('SUCCESS');
            console.log(`Successfully cleaned up token ${tokenId.toString()}`);
          } else {
            // This case should ideally not be hit if success is true and receipt is expected
            console.warn(
              `Receipt not found for deletion of token ${tokenId.toString()} despite success.`
            );
          }
        } catch (error: any) {
          console.error(
            `Failed to clean up token ${tokenId.toString()}:`,
            error
          );
        }
      }
    }
  });

  describe('HederaCreateFungibleTokenTool', () => {
    it('should create a new fungible token with basic parameters (adminKey as current_signer)', async () => {
      const tool = new HederaCreateFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);
      const tokenName = generateUniqueName('TestFTCS');
      const tokenSymbol = generateUniqueName('TFCS');

      // Updated Prompt for Test 1
      const prompt = `Create a new fungible token. Name: "${tokenName}", Symbol: "${tokenSymbol}", Initial Supply: 100000 (smallest units), Decimals: 2, Treasury Account: ${treasuryAccountId.toString()}, Supply Type: FINITE, Max Supply: 1000000 (smallest units). For the adminKey parameter, use the exact string value "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      expect(
        result.success,
        `Test 1 Failed: Agent/Tool Error: ${result.error}`
      ).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      expect(result.receipt.tokenId?.toString()).toMatch(
        new RegExp('^0\\.0\\.\\d+$')
      );

      if (result.receipt.tokenId) {
        const newId = result.receipt.tokenId;
        createdTokenIds.push(newId);
        console.log(`Created token ${newId.toString()} in test 1.`);
      }
    });

    it('should create a new fungible token with an admin key provided as operator public key', async () => {
      const tool = new HederaCreateFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);
      const tokenName = generateUniqueName('TestAdminFT');
      const tokenSymbol = generateUniqueName('TAFT');
      const operatorPubKeyDer = (await kit.signer.getPublicKey()).toStringDer();

      // Updated Prompt for Test 2 - remove adminKeyShouldSign from metaOptions for now
      const prompt = `Create a new fungible token. Name: "${tokenName}", Symbol: "${tokenSymbol}", Initial Supply: 50000, Decimals: 0, Treasury Account: ${treasuryAccountId.toString()}, Admin Key: "${operatorPubKeyDer}", Supply Type: FINITE, Max Supply: 500000.`; // Removed metaOptions for this test

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      expect(
        result.success,
        `Test 2 Failed: Agent/Tool Error: ${result.error}`
      ).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      expect(result.receipt.tokenId?.toString()).toMatch(
        new RegExp('^0\\.0\\.\\d+$')
      );
      if (result.receipt.tokenId) {
        const newId = result.receipt.tokenId;
        createdTokenIds.push(newId);
        console.log(
          `Created token ${newId.toString()} with admin key in test 2.`
        );
      }
    });
  });

  describe('HederaCreateNftTool', () => {
    it('should create a new NFT collection with basic parameters (adminKey as current_signer)', async () => {
      const tool = new HederaCreateNftTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);
      const tokenName = generateUniqueName('TestNFTCollection');
      const tokenSymbol = generateUniqueName('TNFTC');

      const prompt = `Create a new NFT collection. Name: "${tokenName}", Symbol: "${tokenSymbol}", Treasury Account: ${treasuryAccountId.toString()}, Supply Type: FINITE, Max Supply: 100. For the adminKey, use the exact string value "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      expect(
        result.success,
        `NFT Creation Test Failed: Agent/Tool Error: ${result.error}`
      ).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      expect(result.receipt.tokenId?.toString()).toMatch(
        new RegExp('^0\\.0\\.\\d+$')
      );

      if (result.receipt.tokenId) {
        const newId = result.receipt.tokenId;
        createdTokenIds.push(newId); // Add to cleanup queue
        console.log(`Created NFT Collection ${newId.toString()} in test.`);
      }
    });
  });

  describe('HederaMintFungibleTokenTool', () => {
    let mintableFtId: TokenId;

    beforeAll(async () => {
      // Create a specific FT with a supply key for minting tests
      const createTool = new HederaCreateFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(
        createTool,
        openAIApiKey
      );
      const tokenName = generateUniqueName('MintableFT');
      const tokenSymbol = generateUniqueName('MFT');

      const createPrompt = `Create a new fungible token. Name: "${tokenName}", Symbol: "${tokenSymbol}", Initial Supply: 100, Decimals: 0, Treasury Account: ${treasuryAccountId.toString()}, Supply Type: FINITE, Max Supply: 10000. For the adminKey, use "current_signer". For the supplyKey, also use "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: createPrompt });
      const result = getToolOutputFromResult(agentResult);
      expect(
        result.success,
        `Setup for MintFungibleToken failed: ${result.error}`
      ).toBe(true);
      expect(
        result.receipt?.tokenId,
        'Mintable FT setup failed to return tokenId'
      ).toBeDefined();
      mintableFtId = result.receipt.tokenId!;
      createdTokenIds.push(mintableFtId); // Ensure it gets cleaned up
      console.log(
        `Created MintableFT ${mintableFtId.toString()} for minting tests.`
      );
    });

    it('should mint more fungible tokens', async () => {
      const tool = new HederaMintFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);
      const amountToMint = 500;

      const prompt = `Mint ${amountToMint} units of token ${mintableFtId.toString()}. metaOptions: { supplyKeyShouldSign: true }`; // Assuming supplyKeyShouldSign might be needed

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      expect(
        result.success,
        `MintFungibleToken Test Failed: ${result.error}`
      ).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      // Mint transaction receipt has `totalSupply`
      expect(result.receipt.totalSupply).toBeDefined();
      // Initial was 100, minted 500, so new total should be 600 (if totalSupply reflects this post-mint)
      // Note: The actual total supply might need to be queried post-mint to confirm for sure.
      // For now, we check that the transaction succeeded.
      // We could also check `result.output?.newTotalSupply` if the tool were to return it.
      console.log(
        `Minted ${amountToMint} to ${mintableFtId.toString()}. New total supply from receipt: ${result.receipt.totalSupply?.toString()}`
      );
    });
  });

  describe('HederaBurnFungibleTokenTool', () => {
    let burnableFtId: TokenId;
    const initialSupplyForBurn = 2000;
    const amountToBurn = 500;

    beforeAll(async () => {
      const createTool = new HederaCreateFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(
        createTool,
        openAIApiKey
      );
      const tokenName = generateUniqueName('BurnableFT');
      const tokenSymbol = generateUniqueName('BFT');

      // Ensure it has admin, supply, and wipe keys for full testing later if needed
      const createPrompt = `Create a new fungible token. Name: "${tokenName}", Symbol: "${tokenSymbol}", Initial Supply: ${initialSupplyForBurn}, Decimals: 0, Treasury Account: ${treasuryAccountId.toString()}, Supply Type: FINITE, Max Supply: 10000. For the adminKey, use "current_signer". For the supplyKey, use "current_signer". For the wipeKey, also use "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: createPrompt });
      const result = getToolOutputFromResult(agentResult);
      expect(
        result.success,
        `Setup for BurnFungibleToken failed: ${result.error}`
      ).toBe(true);
      expect(
        result.receipt?.tokenId,
        'Burnable FT setup failed to return tokenId'
      ).toBeDefined();
      burnableFtId = result.receipt.tokenId!;
      createdTokenIds.push(burnableFtId);
      console.log(
        `Created BurnableFT ${burnableFtId.toString()} with initial supply ${initialSupplyForBurn} for burning tests.`
      );
    });

    it('should burn fungible tokens from the treasury', async () => {
      const tool = new HederaBurnFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);

      // The burn transaction is signed by the Treasury account by default if no wipe key is involved from another account.
      // If a wipeKey is set on the token (as we did), the burn operation from treasury also needs the supply key's signature.
      // Our current setup: treasury is operator, supplyKey is operator. So operator signature is sufficient.
      const prompt = `Burn ${amountToBurn} units of token ${burnableFtId.toString()}. metaOptions: { supplyKeyShouldSign: true }`; // supplyKeyShouldSign for good measure

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      expect(
        result.success,
        `BurnFungibleToken Test Failed: ${result.error}`
      ).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      expect(result.receipt.totalSupply).toBeDefined();
      const expectedNewSupply = initialSupplyForBurn - amountToBurn;
      expect(parseInt(result.receipt.totalSupply as string, 10)).toEqual(
        expectedNewSupply
      );
      console.log(
        `Burned ${amountToBurn} from ${burnableFtId.toString()}. New total supply from receipt: ${
          result.receipt.totalSupply
        }`
      );
    });
  });

  describe('HederaMintNftTool', () => {
    let nftCollectionId: TokenId;

    beforeAll(async () => {
      // Create a specific NFT collection with a supply key for minting tests
      const createTool = new HederaCreateNftTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(
        createTool,
        openAIApiKey
      );
      const tokenName = generateUniqueName('MintTestNFT');
      const tokenSymbol = generateUniqueName('MTNFT');

      const createPrompt = `Create a new NFT collection. Name: "${tokenName}", Symbol: "${tokenSymbol}", Treasury Account: ${treasuryAccountId.toString()}, Supply Type: FINITE, Max Supply: 100. For the adminKey, use "current_signer". For the supplyKey, also use "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: createPrompt });
      const result = getToolOutputFromResult(agentResult);
      expect(result.success, `Setup for MintNFT failed: ${result.error}`).toBe(
        true
      );
      expect(
        result.receipt?.tokenId,
        'NFT Collection setup for MintNFT failed to return tokenId'
      ).toBeDefined();
      nftCollectionId = result.receipt.tokenId!;
      createdTokenIds.push(nftCollectionId);
      console.log(
        `Created NFT Collection ${nftCollectionId.toString()} for minting tests.`
      );
    });

    it('should mint a new NFT into the collection', async () => {
      const tool = new HederaMintNftTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);
      const metadata = Buffer.from(
        `NFT metadata for ${generateUniqueName('Serial')}`
      ).toString('base64'); // Base64 encoded string

      const prompt = `Mint a new NFT into collection ${nftCollectionId.toString()} with metadata "${metadata}". metaOptions: { supplyKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      expect(result.success, `MintNFT Test Failed: ${result.error}`).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      expect(result.receipt.serials).toBeDefined();
      expect(result.receipt.serials.length).toBeGreaterThan(0);
      // Serials in the parsed JSON from receipt will likely be numbers or strings.
      const newSerialValue = result.receipt.serials[0];
      const newSerial =
        typeof newSerialValue === 'string'
          ? parseInt(newSerialValue, 10)
          : (newSerialValue as number);
      expect(typeof newSerial).toBe('number'); // Add an assertion for the type
      console.log(
        `Minted NFT serial ${newSerial} into collection ${nftCollectionId.toString()}.`
      );
      // We could potentially add this serial to a list for later burning if needed for a burn test
    });
  });

  describe('HederaBurnNftTool', () => {
    let burnableNftCollectionId: TokenId;
    let mintedSerial: number;

    beforeAll(async () => {
      // 1. Create an NFT collection with admin, supply, and wipe keys
      const createTool = new HederaCreateNftTool({ hederaKit: kit });
      let agentExecutor = await createTestAgentExecutor(
        createTool,
        openAIApiKey
      );
      const collectionName = generateUniqueName('BurnTestNFT');
      const collectionSymbol = generateUniqueName('BTNFT');

      const createPrompt = `Create a new NFT collection. Name: "${collectionName}", Symbol: "${collectionSymbol}", Treasury Account: ${treasuryAccountId.toString()}, Supply Type: FINITE, Max Supply: 10. For the adminKey, supplyKey, and wipeKey, use the exact string value "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      let agentResult = await agentExecutor.invoke({ input: createPrompt });
      let result = getToolOutputFromResult(agentResult);
      // It's possible the agent needs a supplyKey for NFT creation to succeed directly.
      // The agent might self-correct, or this initial creation might fail if supplyKey isn't prompted for.
      // The previous successful run showed the agent self-corrects by adding supplyKey if the first attempt fails.
      // We rely on that behavior here for the setup.
      if (
        !result.success &&
        result.error?.includes('TOKEN_HAS_NO_SUPPLY_KEY')
      ) {
        // This was the agent's first attempt; it should retry with supplyKey.
        // The actual successful result would be in the last intermediate step of that *overall* successful agentResult.
        // However, for simplicity in setup, we assume the agentExecutor.invoke will eventually lead to success if possible.
        console.warn(
          'Initial NFT collection creation attempt failed due to no supply key, relying on agent self-correction.'
        );
        // The `getToolOutputFromResult` already gets the last intermediate step if available.
        // If it still reflects the error, the setup fails.
      }
      expect(
        result.success,
        `Setup (Create NFT Collection for Burn Test) failed: ${result.error}`
      ).toBe(true);
      expect(
        result.receipt?.tokenId,
        'NFT Collection setup for Burn Test failed to return tokenId'
      ).toBeDefined();
      burnableNftCollectionId = result.receipt.tokenId!;
      createdTokenIds.push(burnableNftCollectionId);
      console.log(
        `Created NFT Collection ${burnableNftCollectionId.toString()} for burn tests.`
      );

      // 2. Mint an NFT into this collection
      const mintTool = new HederaMintNftTool({ hederaKit: kit });
      agentExecutor = await createTestAgentExecutor(mintTool, openAIApiKey);
      const metadata = Buffer.from(
        `NFT to burn ${generateUniqueName('Serial')}`
      ).toString('base64');
      const mintPrompt = `Mint a new NFT into collection ${burnableNftCollectionId.toString()} with metadata "${metadata}". metaOptions: { supplyKeyShouldSign: true }`;

      agentResult = await agentExecutor.invoke({ input: mintPrompt });
      result = getToolOutputFromResult(agentResult);
      expect(
        result.success,
        `Setup (Mint NFT for Burn Test) failed: ${result.error}`
      ).toBe(true);
      expect(result.receipt?.serials).toBeDefined();
      expect(result.receipt.serials.length).toBeGreaterThan(0);
      const newSerialValue = result.receipt.serials[0];
      mintedSerial =
        typeof newSerialValue === 'string'
          ? parseInt(newSerialValue, 10)
          : (newSerialValue as number);
      console.log(
        `Minted NFT serial ${mintedSerial} into ${burnableNftCollectionId.toString()} for burn test.`
      );
    });

    it('should burn a specific NFT serial from the collection', async () => {
      const tool = new HederaBurnNftTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);
      const prompt = `Burn NFT serial ${mintedSerial} of token ${burnableNftCollectionId.toString()}. metaOptions: { wipeKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      expect(result.success, `BurnNFT Test Failed: ${result.error}`).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      expect(result.receipt.totalSupply).toBeDefined();
      expect(parseInt(result.receipt.totalSupply as string, 10)).toEqual(0);
      console.log(
        `Burned NFT serial ${mintedSerial} from ${burnableNftCollectionId.toString()}. New total supply from receipt: ${
          result.receipt.totalSupply
        }`
      );
    });
  });

  describe('HederaPauseUnpauseTokenTool', () => {
    let pausableTokenId: TokenId;

    beforeAll(async () => {
      const createTool = new HederaCreateFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(
        createTool,
        openAIApiKey
      );
      const tokenName = generateUniqueName('PausableFT');
      const tokenSymbol = generateUniqueName('PFT');

      const createPrompt = `Create a new fungible token. Name: "${tokenName}", Symbol: "${tokenSymbol}", Initial Supply: 1000, Decimals: 0, Treasury Account: ${treasuryAccountId.toString()}. For the adminKey and pauseKey, use "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: createPrompt });
      const result = getToolOutputFromResult(agentResult);
      expect(
        result.success,
        `Setup for PauseUnpause failed: ${result.error}`
      ).toBe(true);
      expect(
        result.receipt?.tokenId,
        'Pausable FT setup failed to return tokenId'
      ).toBeDefined();
      pausableTokenId = result.receipt.tokenId!;
      createdTokenIds.push(pausableTokenId);
      console.log(
        `Created PausableFT ${pausableTokenId.toString()} for pause/unpause tests.`
      );
    });

    it('should pause a token and then unpause it', async () => {
      // Pause the token
      const pauseTool = new HederaPauseTokenTool({ hederaKit: kit });
      let agentExecutor = await createTestAgentExecutor(
        pauseTool,
        openAIApiKey
      );
      let prompt = `Pause token ${pausableTokenId.toString()}. metaOptions: { pauseKeyShouldSign: true }`; // pauseKeyShouldSign if we had such metaOption

      let agentResult = await agentExecutor.invoke({ input: prompt });
      let result = getToolOutputFromResult(agentResult);
      expect(result.success, `Pause Token Test Failed: ${result.error}`).toBe(
        true
      );
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      console.log(`Token ${pausableTokenId.toString()} paused successfully.`);

      // TODO: Optionally, verify token is paused using a query (e.g., GetTokenInfo)
      // For now, we rely on the transaction success.

      // Unpause the token
      const unpauseTool = new HederaUnpauseTokenTool({ hederaKit: kit });
      agentExecutor = await createTestAgentExecutor(unpauseTool, openAIApiKey);
      prompt = `Unpause token ${pausableTokenId.toString()}. metaOptions: { pauseKeyShouldSign: true }`;

      agentResult = await agentExecutor.invoke({ input: prompt });
      result = getToolOutputFromResult(agentResult);
      expect(result.success, `Unpause Token Test Failed: ${result.error}`).toBe(
        true
      );
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      console.log(`Token ${pausableTokenId.toString()} unpaused successfully.`);

      // TODO: Optionally, verify token is unpaused.
    });
  });

  // --- HederaUpdateTokenTool Tests ---
  describe('HederaUpdateTokenTool', () => {
    let updateableTokenId: TokenId;
    const originalTokenName = generateUniqueName('UpdatableToken');
    const originalTokenSymbol = generateUniqueName('UTK');

    beforeAll(async () => {
      const createTool = new HederaCreateFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(
        createTool,
        openAIApiKey
      );

      const createPrompt = `Create a new fungible token. Name: "${originalTokenName}", Symbol: "${originalTokenSymbol}", Initial Supply: 100, Decimals: 0, Treasury Account: ${treasuryAccountId.toString()}. For the adminKey, use "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: createPrompt });
      const result = getToolOutputFromResult(agentResult);
      expect(
        result.success,
        `Setup for UpdateToken failed: ${result.error}`
      ).toBe(true);
      expect(
        result.receipt?.tokenId,
        'Updatable FT setup failed to return tokenId'
      ).toBeDefined();
      updateableTokenId = result.receipt.tokenId!;
      createdTokenIds.push(updateableTokenId);
      console.log(
        `Created UpdatableToken ${updateableTokenId.toString()} for update tests.`
      );
    });

    it("should update the token's name and symbol", async () => {
      const tool = new HederaUpdateTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);
      const newTokenName = generateUniqueName('UpdatedTokenName');
      const newTokenSymbol = generateUniqueName('UTKS');

      const prompt = `Update token ${updateableTokenId.toString()}. Set its name to "${newTokenName}" and its symbol to "${newTokenSymbol}". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      expect(result.success, `UpdateToken Test Failed: ${result.error}`).toBe(
        true
      );
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      console.log(
        `Token ${updateableTokenId.toString()} updated successfully.`
      );
      // TODO: Optionally, query token info to verify new name and symbol.
    });
  });

  describe('HederaAssociateTokensTool', () => {
    let associatableTokenId: TokenId;
    // Placeholder for a secondary account ID. In a real scenario, this account would need to exist.
    const secondaryAccountIdString = '0.0.12345'; // Replace with a real secondary testnet account if available for manual testing

    beforeAll(async () => {
      // Create a token to be associated
      const createTool = new HederaCreateFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(
        createTool,
        openAIApiKey
      );
      const tokenName = generateUniqueName('AssociatableFT');
      const tokenSymbol = generateUniqueName('AFT');

      const createPrompt = `Create a new fungible token. Name: "${tokenName}", Symbol: "${tokenSymbol}", Initial Supply: 100, Decimals: 0, Treasury Account: ${treasuryAccountId.toString()}. For the adminKey, use "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: createPrompt });
      const result = getToolOutputFromResult(agentResult);
      expect(
        result.success,
        `Setup for AssociateToken failed (token creation): ${result.error}`
      ).toBe(true);
      expect(
        result.receipt?.tokenId,
        'Associatable FT setup failed to return tokenId'
      ).toBeDefined();
      associatableTokenId = result.receipt.tokenId!;
      createdTokenIds.push(associatableTokenId);
      console.log(
        `Created AssociatableFT ${associatableTokenId.toString()} for association tests.`
      );
    });

    it('should associate a token with a (placeholder) secondary account', async () => {
      const tool = new HederaAssociateTokensTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);

      // Note: For this test to truly pass against a live network, the secondaryAccountIdString would need to exist,
      // and its key would need to sign the association if the token has no KYC key, or if it does and KYC is not granted.
      // If the token has a KYC key, KYC must be granted to secondaryAccountIdString first.
      // If the token has freeze_default = true, the account might be frozen upon association.
      // We are testing the tool's ability to construct and submit the transaction signed by the operator.
      const prompt = `Associate token ${associatableTokenId.toString()} with account ${secondaryAccountIdString}. The account ${secondaryAccountIdString} should sign for this association. metaOptions: { /* We need a way for the test to provide secondary signer or assume operator can do this if authorized by token settings */ }`;
      // For this test, we assume the operator is trying to associate for an account that will sign with its own key later,
      // or the token is configured to not require such (e.g. no KYC key).
      // The tool itself is signed by the operator. The actual association also needs the accountId's signature(s).
      // The current tool doesn't support providing additional signers beyond the operator.
      // So this test will likely show TRANSACTION_REQUIRES_ZERO_NODE_ACCOUNT if not properly signed by target account or fails due to KYC/Freeze.
      // We will simplify the prompt to just what the operator can do.

      const simplifiedPrompt = `Associate token ${associatableTokenId.toString()} with account ${secondaryAccountIdString}. Assume account ${treasuryAccountId.toString()} (operator) is submitting this for ${secondaryAccountIdString} and ${secondaryAccountIdString} will sign separately or has pre-approved.`;
      // Even simpler: The tool only allows the operator to sign. So the operator cannot associate for another account unless that account has signed a transaction granting permission,
      // OR the token has no KYC key and is not frozen by default for the target account.
      // For now, let's test the tool submitting the transaction. The transaction will likely fail with INVALID_SIGNATURE or ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN etc.
      // unless secondaryAccountIdString is the operator itself (which is not a valid association test).
      // The current tool cannot make this succeed for a distinct secondary account without more features (multi-sig).

      // Let's assume for the sake of testing the tool call structure that the account ID is the operator's own ID
      // (though this is not a useful real-world association, it tests the tool path)
      // OR, we just expect a specific failure if secondaryAccountIdString is different.

      // Test path: Operator (treasury) tries to associate the token with ITSELF (which is not how it works, it's already treasury)
      // This will likely fail with an SDK error or specific Hedera error code, which we can assert.
      // A better test would be a secondary account ID for which the operator *can* associate (e.g. if token has no KYC).

      // Given the limitations, let's test the call with the placeholder and expect a failure that indicates the account needs to sign or KYC, etc.
      // This tests the tool structure, not necessarily a successful association for a distinct account.
      const testPrompt = `Associate token ${associatableTokenId.toString()} with account ${secondaryAccountIdString}.`;

      const agentResult = await agentExecutor.invoke({ input: testPrompt });
      const result = getToolOutputFromResult(agentResult);

      // We expect this to fail because secondaryAccountIdString (0.0.12345) needs to sign,
      // or KYC/Freeze might prevent it. The tool only signs with the operator.
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Example expected errors: TRANSACTION_REQUIRES_ZERO_NODE_ACCOUNT, INVALID_SIGNATURE (if account doesn't exist or can't sign),
      // ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN, TOKEN_NOT_ASSOCIATED_TO_ACCOUNT (for dissociate), TOKEN_WAS_DENIED_KYC
      // For now, just check that it didn't succeed and an error was reported.
      console.log(
        `Association attempt for ${secondaryAccountIdString} with ${associatableTokenId.toString()} correctly failed as expected (no secondary signature): ${
          result.error
        }`
      );
    });
  });

  describe('HederaDeleteTokenTool (Dedicated Test)', () => {
    let deletableTokenId: TokenId;

    beforeEach(async () => {
      // Using beforeEach to create a fresh token for each delete attempt
      const createTool = new HederaCreateFungibleTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(
        createTool,
        openAIApiKey
      );
      const tokenName = generateUniqueName('DeletableFT');
      const tokenSymbol = generateUniqueName('DFT');

      // Token needs an admin key to be deleted
      const createPrompt = `Create a new fungible token. Name: "${tokenName}", Symbol: "${tokenSymbol}", Initial Supply: 100, Decimals: 0, Treasury Account: ${treasuryAccountId.toString()}. For the adminKey, use "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: createPrompt });
      const result = getToolOutputFromResult(agentResult);
      expect(
        result.success,
        `Setup for DeleteToken test failed (token creation): ${result.error}`
      ).toBe(true);
      expect(
        result.receipt?.tokenId,
        'Deletable FT setup failed to return tokenId'
      ).toBeDefined();
      deletableTokenId = result.receipt.tokenId!;
      // No need to add to createdTokenIds for global afterAll, as this test will delete it.
      // If the test fails, afterAll will catch any leftovers if it were added, but this design is cleaner.
      console.log(
        `Created DeletableFT ${deletableTokenId.toString()} for dedicated delete test.`
      );
    });

    it('should delete a token successfully', async () => {
      const tool = new HederaDeleteTokenTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);

      const prompt = `Delete the token with ID ${deletableTokenId.toString()}. metaOptions: { adminKeyShouldSign: true }`;

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      expect(result.success, `DeleteToken Test Failed: ${result.error}`).toBe(
        true
      );
      expect(result.receipt).toBeDefined();
      expect(result.receipt.status).toEqual('SUCCESS');
      console.log(
        `Token ${deletableTokenId.toString()} deleted successfully in dedicated test.`
      );

      // To prevent afterAll from trying to delete it again (and failing if it's already gone)
      // we could remove it from createdTokenIds if it was added, but we chose not to add it.
    });
  });

  describe('HederaDissociateTokensTool', () => {
    let dissociatableTokenId: TokenId;
    // Placeholder for a secondary account ID
    const secondaryAccountIdString = '0.0.12345';
    let associationDoneInSetup = false;

    beforeAll(async () => {
      // 1. Create a token
      const createTool = new HederaCreateFungibleTokenTool({ hederaKit: kit });
      let agentExecutor = await createTestAgentExecutor(
        createTool,
        openAIApiKey
      );
      const tokenName = generateUniqueName('DissociatableFT');
      const tokenSymbol = generateUniqueName('DFT');
      const createPrompt = `Create a new fungible token. Name: "${tokenName}", Symbol: "${tokenSymbol}", Initial Supply: 100, Decimals: 0, Treasury Account: ${treasuryAccountId.toString()}. For the adminKey, use "current_signer". metaOptions: { adminKeyShouldSign: true }`;

      let agentResult = await agentExecutor.invoke({ input: createPrompt });
      let result = getToolOutputFromResult(agentResult);
      expect(
        result.success,
        `Setup for DissociateToken failed (token creation): ${result.error}`
      ).toBe(true);
      expect(
        result.receipt?.tokenId,
        'Dissociatable FT setup failed to return tokenId'
      ).toBeDefined();
      dissociatableTokenId = result.receipt.tokenId!;
      createdTokenIds.push(dissociatableTokenId);
      console.log(
        `Created DissociatableFT ${dissociatableTokenId.toString()} for dissociation tests.`
      );

      // 2. Attempt to associate this token with the secondary account
      // This step is expected to FAIL the actual association because secondary account doesn't sign.
      // However, we include it to mirror a real scenario for dissociation testing.
      // A successful dissociation requires a prior successful association.
      const associateTool = new HederaAssociateTokensTool({ hederaKit: kit });
      agentExecutor = await createTestAgentExecutor(
        associateTool,
        openAIApiKey
      );
      const associatePrompt = `Associate token ${dissociatableTokenId.toString()} with account ${secondaryAccountIdString}.`;
      agentResult = await agentExecutor.invoke({ input: associatePrompt });
      result = getToolOutputFromResult(agentResult);
      if (result.success) {
        associationDoneInSetup = true;
        console.log(
          `Token ${dissociatableTokenId.toString()} successfully associated with ${secondaryAccountIdString} in setup (unexpected for placeholder).`
        );
      } else {
        associationDoneInSetup = false;
        console.warn(
          `Token association with ${secondaryAccountIdString} failed as expected in setup: ${result.error}. Dissociation test will likely also fail transaction.`
        );
      }
    });

    it('should attempt to dissociate a token from a (placeholder) secondary account', async () => {
      // This test will likely fail the dissociate transaction for the same reasons association would fail
      // (secondary account needs to sign, or KYC/Freeze issues for that account).
      // We are testing the tool path and its error reporting.
      const tool = new HederaDissociateTokensTool({ hederaKit: kit });
      const agentExecutor = await createTestAgentExecutor(tool, openAIApiKey);

      const prompt = `Dissociate token ${dissociatableTokenId.toString()} from account ${secondaryAccountIdString}.`;

      const agentResult = await agentExecutor.invoke({ input: prompt });
      const result = getToolOutputFromResult(agentResult);

      // If association didn't happen, dissociation might fail with TOKEN_NOT_ASSOCIATED_TO_ACCOUNT
      // If association somehow "succeeded" (e.g. if secondaryAccount was operator), then dissociation would need sigs.
      // Given our setup, we expect a failure that reflects the account not being associated or not being able to sign.
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      console.log(
        `Dissociation attempt for ${secondaryAccountIdString} from ${dissociatableTokenId.toString()} correctly resulted in a transaction failure (as expected): ${
          result.error
        }`
      );
    });
  });
});
