import { AbstractSigner } from '../signer/abstract-signer';
import { HederaAgentKit, PluginConfig } from './agent';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Logger } from '@hashgraphonline/standards-sdk';
import { TransactionReceipt } from '@hashgraph/sdk';
import { StructuredTool } from '@langchain/core/tools';
import { AgentOperationalMode, MirrorNodeConfig } from '../types';
import { ModelCapability } from '../types/model-capability';
import { ModelCapabilityDetector } from '../utils/model-capability-detector';
import {
  TokenUsageCallbackHandler,
  TokenUsage,
  CostCalculation,
  calculateTokenCostSync,
} from '../utils/token-usage-tracker';

/**
 * Configuration for the HederaConversationalAgent.
 */
export interface HederaConversationalAgentConfig {
  operationalMode?: AgentOperationalMode;
  pluginConfig?: PluginConfig;
  userAccountId?: string;
  customSystemMessagePreamble?: string;
  customSystemMessagePostamble?: string;
  verbose?: boolean;
  llm?: BaseChatModel;
  openAIApiKey?: string;
  openAIModelName?: string;
  scheduleUserTransactionsInBytesMode?: boolean;
  modelCapability?: ModelCapability;
  mirrorNodeConfig?: MirrorNodeConfig;
  disableLogging?: boolean;
  toolFilter?: (tool: StructuredTool) => boolean;
}

/**
 * Defines the structured response from the HederaConversationalAgent's processMessage method.
 */
export interface AgentResponse {
  output: string;
  message?: string;
  transactionBytes?: string | undefined;
  receipt?: TransactionReceipt | object | undefined;
  scheduleId?: string | undefined;
  transactionId?: string | undefined;
  notes?: string[];
  error?: string | undefined;
  intermediateSteps?: unknown;
  rawToolOutput?: unknown;
  tokenUsage?: TokenUsage | undefined;
  cost?: CostCalculation | undefined;
  [key: string]: unknown;
}

/**
 * Expected structure of a successful JSON output from BaseHederaTransactionTool.
 */
interface SuccessfulToolOutput {
  success: true;
  transactionBytes?: string;
  receipt?: TransactionReceipt | object;
  scheduleId?: string;
  transactionId?: string;
  notes?: string[];
  op?: string;
  description?: string;
  output?: string;
  [key: string]: unknown;
}

/**
 * Expected structure of a failed JSON output from BaseHederaTransactionTool.
 */
interface FailedToolOutput {
  success: false;
  error: string;
  transactionId?: string;
  notes?: string[];
  output?: string;
  [key: string]: unknown;
}

type ParsedToolOutput = SuccessfulToolOutput | FailedToolOutput;

/**
 * HederaConversationalAgent orchestrates interactions between an LLM, HederaAgentKit tools,
 * and the user to facilitate Hedera Network operations via a conversational interface.
 */
export class HederaConversationalAgent {
  private hederaKit: HederaAgentKit;
  private llm: BaseChatModel;
  private agentExecutor!: AgentExecutor;
  private logger: Logger;
  private config: HederaConversationalAgentConfig;
  private systemMessage!: string;
  private tokenUsageHandler: TokenUsageCallbackHandler;

  /**
   * Creates an instance of HederaConversationalAgent.
   * @param {AbstractSigner} signer - The signer implementation for Hedera transactions.
   * @param {HederaConversationalAgentConfig} [config={}] - Configuration options for the agent.
   */
  constructor(
    signer: AbstractSigner,
    config: HederaConversationalAgentConfig = {}
  ) {
    this.config = {
      operationalMode: 'provideBytes',
      verbose: false,
      scheduleUserTransactionsInBytesMode: true,
      ...config,
    };

    const initialModelCapability =
      this.config.modelCapability ||
      ModelCapabilityDetector.getInstance().getModelCapabilitySync(
        config.openAIModelName
      );

    const shouldDisableLogs =
      this.config.disableLogging || process.env.DISABLE_LOGS === 'true';
    const defaultLogLevel = this.config.verbose ? 'debug' : 'info';
    const logLevel = shouldDisableLogs ? 'silent' : defaultLogLevel;

    this.logger = new Logger({
      level: logLevel,
      module: 'HederaConversationalAgent',
      silent: shouldDisableLogs,
    });

    this.hederaKit = new HederaAgentKit(
      signer,
      this.config.pluginConfig,
      this.config.operationalMode,
      this.config.userAccountId,
      this.config.scheduleUserTransactionsInBytesMode,
      initialModelCapability,
      this.config.openAIModelName ||
        process.env.OPENAI_MODEL_NAME ||
        'gpt-4o-mini',
      this.config.mirrorNodeConfig,
      shouldDisableLogs
    );

    const modelName =
      this.config.openAIModelName ||
      process.env.OPENAI_MODEL_NAME ||
      'gpt-4o-mini';

    this.tokenUsageHandler = new TokenUsageCallbackHandler(
      modelName,
      this.logger
    );

    if (this.config.llm) {
      this.llm = this.config.llm;
    } else {
      const apiKey = this.config.openAIApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OpenAI API key is required. Provide it in config or via OPENAI_API_KEY env variable.'
        );
      }
      this.llm = new ChatOpenAI({
        apiKey: apiKey,
        modelName: modelName,
        temperature: 0.1,
        callbacks: [this.tokenUsageHandler],
      } as ChatOpenAIFields);
    }
  }

  /**
   * Constructs the system message for the LLM based on configuration.
   * @returns {string} The system message string.
   */
  private constructSystemMessage(): string {
    let messageParts: string[] = [];
    const agentOperatorId = this.hederaKit.signer.getAccountId().toString();
    const userAccId = this.config.userAccountId;

    if (this.config.customSystemMessagePreamble) {
      messageParts.push(this.config.customSystemMessagePreamble);
    }
    messageParts.push(
      `You are a helpful Hedera assistant. Your primary operator account is ${agentOperatorId}. ` +
        `You have tools to interact with the Hedera network. ` +
        `When using any tool, provide all necessary parameters as defined by that tool's schema and description.`
    );
    if (userAccId) {
      messageParts.push(
        `The user you are assisting has a personal Hedera account ID: ${userAccId}. ` +
          `IMPORTANT: When the user says things like "I want to send HBAR" or "transfer my tokens", you MUST use ${userAccId} as the sender/from account. ` +
          `For example, if user says "I want to send 2 HBAR to 0.0.800", you must set up a transfer where ${userAccId} sends the HBAR, not your operator account.`
      );
    }
    if (this.hederaKit.operationalMode === 'directExecution') {
      messageParts.push(
        `\nOPERATIONAL MODE: 'directExecution'. Your goal is to execute transactions directly using your tools. ` +
          `Your account ${agentOperatorId} will be the payer for these transactions. ` +
          `Even if the user's account (${
            userAccId || 'a specified account'
          }) is the actor in the transaction body (e.g., sender of HBAR), ` +
          `you (the agent with operator ${agentOperatorId}) are still executing and paying. For HBAR transfers, ensure the amounts in the 'transfers' array sum to zero (as per tool schema), balancing with your operator account if necessary.`
      );
    } else {
      if (this.config.scheduleUserTransactionsInBytesMode && userAccId) {
        messageParts.push(
          `\nOPERATIONAL MODE: 'provideBytes' with scheduled transactions for user actions. ` +
            `When a user asks for a transaction to be prepared (e.g., creating a token, topic, transferring assets for them to sign, etc), ` +
            `you MUST default to creating a Scheduled Transaction using the appropriate tool with the metaOption 'schedule: true'. ` +
            `The user (with account ID ${userAccId}) will be the one to ultimately pay for and (if needed) sign the inner transaction. ` +
            `Your operator account (${agentOperatorId}) will pay for creating the schedule entity itself. ` +
            `You MUST return the ScheduleId and details of the scheduled operation in a structured JSON format with these fields: success, op, schedule_id, description, payer_account_id_scheduled_tx, and scheduled_transaction_details.` +
            `\nOnce a transaction is scheduled and you\'ve provided the Schedule ID, you should ask the user if they want to sign and execute it. If they agree, use the \'hedera-sign-and-execute-scheduled-transaction\' tool, providing the Schedule ID. This tool will prepare a ScheduleSignTransaction. If the agent is also configured for \'provideBytes\', this ScheduleSignTransaction will be returned as bytes for the user to sign and submit using their account ${userAccId}. If the agent is in \'directExecution\' mode for the ScheduleSign part (not typical for user-scheduled flows but possible), the agent would sign and submit it.`
        );
      } else {
        messageParts.push(
          `\nOPERATIONAL MODE: 'provideBytes'. Your goal is to provide transaction bytes directly. ` +
            `When a user asks for a transaction to be prepared (e.g., for them to sign, or for scheduling without the default scheduling flow), ` +
            `you MUST call the appropriate tool. If you want raw bytes for the user to sign for their own account ${
              userAccId || 'if specified'
            }, ensure the tool constructs the transaction body accordingly and use metaOption 'returnBytes: true' if available, or ensure the builder is configured for the user. ` +
            (userAccId
              ? `If the transaction body was constructed to reflect the user's account ${userAccId} as the actor, also inform the user the application can adapt these bytes for their signing and payment using their account ${userAccId}.`
              : '')
        );
      }
    }
    messageParts.push(
      '\nAlways be concise. If the tool provides a JSON string as its primary output (especially in provideBytes mode), make your accompanying text brief. If the tool does not provide JSON output or an error occurs, your narrative becomes primary; if notes were generated by the tool in such cases, append them to your textual response.'
    );
    if (this.config.customSystemMessagePostamble) {
      messageParts.push(this.config.customSystemMessagePostamble);
    }
    return messageParts.join('\n');
  }

  /**
   * Initializes the conversational agent, including its internal HederaAgentKit and LangChain components.
   * Must be called before `processMessage`.
   */
  public async initialize(): Promise<void> {
    const detectedCapability =
      await ModelCapabilityDetector.getInstance().getModelCapability(
        this.config.openAIModelName
      );
    if (detectedCapability !== this.hederaKit.modelCapability) {
      this.hederaKit.modelCapability = detectedCapability;
      this.logger.info(
        `Updated model capability to ${detectedCapability} after API fetch`
      );
    }

    await this.hederaKit.initialize();
    this.systemMessage = this.constructSystemMessage();
    let toolsFromKit = this.hederaKit.getAggregatedLangChainTools();

    if (this.config.toolFilter) {
      const originalCount = toolsFromKit.length;
      toolsFromKit = toolsFromKit.filter(this.config.toolFilter);
      const filteredCount = originalCount - toolsFromKit.length;
      if (filteredCount > 0) {
        this.logger.info(
          `Filtered out ${filteredCount} tools based on provided filter`
        );
      }
    }

    if (toolsFromKit.length === 0) {
      this.logger.warn(
        'No tools were loaded into HederaAgentKit. The agent may not function correctly.'
      );
    }

    this.logger.info(
      `Loaded ${toolsFromKit.length} tools for model capability: ${this.hederaKit.modelCapability}`
    );

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', this.systemMessage],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);
    const agent = await createOpenAIToolsAgent({
      llm: this.llm,
      tools: toolsFromKit as unknown as StructuredTool[],
      prompt,
    });
    this.agentExecutor = new AgentExecutor({
      agent,
      tools: toolsFromKit as unknown as StructuredTool[],
      verbose: this.config.verbose ?? false,
      returnIntermediateSteps: true,
    });
    this.logger.info('HederaConversationalAgent initialized.');
  }

  /**
   * Processes a user's input message and returns the agent's response.
   * @param {string} userInput - The user's input string.
   * @param {Array<{ type: 'human' | 'ai'; content: string }>} [chatHistoryInput] - Optional existing chat history.
   * @returns {Promise<AgentResponse>} The agent's structured response.
   */
  public async processMessage(
    userInput: string,
    chatHistoryInput?: Array<{ type: 'human' | 'ai'; content: string }>
  ): Promise<AgentResponse> {
    if (!this.agentExecutor) {
      throw new Error(
        'HederaConversationalAgent not initialized. Call await initialize() first.'
      );
    }

    const langchainChatHistory: BaseMessage[] = (chatHistoryInput || []).map(
      (msg) =>
        msg.type === 'human'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
    );

    let response: AgentResponse = {
      output: '',
      message: '',
      notes: [],
      transactionBytes: undefined,
      receipt: undefined,
      scheduleId: undefined,
      transactionId: undefined,
      error: undefined,
      intermediateSteps: undefined,
      rawToolOutput: undefined,
      tokenUsage: undefined,
      cost: undefined,
    };

    try {
      const result = await this.agentExecutor.invoke({
        input: userInput,
        chat_history: langchainChatHistory,
      });

      response.message = result.output || '';
      let parsedSteps = result?.intermediateSteps?.[0]
        ?.observation as ParsedToolOutput[];
      if (parsedSteps) {
        try {
          response = {
            ...response,
            ...JSON.parse(parsedSteps as unknown as string),
          };
        } catch (e) {
          this.logger.error('Error parsing intermediate steps:', e);
        }
      }

      if (!response.output || response.output.trim() === '') {
        response.output = 'Agent action complete.';
      }

      const tokenUsage = this.tokenUsageHandler.getLatestTokenUsage();
      if (tokenUsage) {
        response.tokenUsage = tokenUsage;
        response.cost = calculateTokenCostSync(tokenUsage);

        this.logger.debug('Token usage for request:', {
          promptTokens: tokenUsage.promptTokens,
          completionTokens: tokenUsage.completionTokens,
          totalTokens: tokenUsage.totalTokens,
          cost: response.cost.totalCost,
        });
      }

      return response;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error in HederaConversationalAgent.processMessage: ${errorMessage}`,
        error
      );

      const tokenUsage = this.tokenUsageHandler.getLatestTokenUsage();
      let cost: CostCalculation | undefined;
      if (tokenUsage) {
        cost = calculateTokenCostSync(tokenUsage);
      }

      return {
        output: 'Sorry, I encountered an error processing your request.',
        message: response.message || '',
        notes: response.notes || [],
        error: errorMessage,
        transactionBytes: response?.transactionBytes,
        receipt: response.receipt,
        scheduleId: response.scheduleId,
        transactionId: response.transactionId,
        intermediateSteps: response.intermediateSteps,
        rawToolOutput: response.rawToolOutput,
        tokenUsage: tokenUsage || undefined,
        cost,
      };
    }
  }

  /**
   * Allows updating the operational mode of the agent after instantiation.
   * This also updates the underlying HederaAgentKit's mode and reconstructs the system message for the LLM.
   * Note: For the new system prompt to take full effect with the existing LangChain agent,
   * re-initialization (calling `initialize()`) or recreation of the agent executor might be needed.
   * @param {AgentOperationalMode} mode - The new operational mode.
   */
  public setOperationalMode(mode: AgentOperationalMode): void {
    this.config.operationalMode = mode;
    this.hederaKit.operationalMode = mode;
    this.systemMessage = this.constructSystemMessage();
    this.logger.info(
      `Operational mode set to: ${mode}. System message and kit mode updated.`
    );
    if (this.agentExecutor) {
      this.logger.warn(
        'Operational mode changed. For the new system prompt to fully take effect, re-initialization (call initialize()) or recreation of the agent executor is needed.'
      );
    }
  }

  /**
   * Get cumulative token usage across all requests
   * @returns {TokenUsage & { cost: CostCalculation }} Total token usage and cost
   */
  public getTotalTokenUsage(): TokenUsage & { cost: CostCalculation } {
    const totalUsage = this.tokenUsageHandler.getTotalTokenUsage();
    const cost = calculateTokenCostSync(totalUsage);
    return { ...totalUsage, cost };
  }

  /**
   * Get token usage history for all requests
   * @returns {Array<TokenUsage & { cost: CostCalculation }>} Array of token usage records with costs
   */
  public getTokenUsageHistory(): Array<TokenUsage & { cost: CostCalculation }> {
    return this.tokenUsageHandler.getTokenUsageHistory().map((usage) => ({
      ...usage,
      cost: calculateTokenCostSync(usage),
    }));
  }

  /**
   * Reset token usage tracking
   */
  public resetTokenUsageTracking(): void {
    this.tokenUsageHandler.reset();
    this.logger.info('Token usage tracking has been reset');
  }
}
