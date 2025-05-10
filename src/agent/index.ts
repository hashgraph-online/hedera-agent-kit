import {
  AccountId,
  Client,
  TokenId,
  TopicId,
  PublicKey,
  TransactionId,
  TransactionReceipt,
  AccountBalanceQuery,
  ScheduleSignTransaction,
  ScheduleId,
} from '@hashgraph/sdk';
import {
  AbstractSigner,
  HederaNetworkType as SignerHederaNetworkType,
} from '../signer/abstract-signer';
import {
  Airdrop,
  HCSMessage,
  HederaNetworkType as KitHederaNetworkType,
  HtsTokenDetails,
  TokenBalance,
  DetailedTokenBalance,
  SignScheduledTransactionParams,
} from '../types';
import {
  get_hts_balance,
  get_hts_token_details,
  get_pending_airdrops,
  get_token_holders,
  get_topic_messages,
} from '../tools';
import {
  HederaMirrorNode,
  Logger as StandardsSdkLogger,
  AccountResponse as StandardsSdkAccountResponse,
  TopicResponse as StandardsSdkTopicResponse,
} from '@hashgraphonline/standards-sdk';
import {
  IPlugin,
  PluginLoader,
  PluginContext as StandardsAgentKitPluginContext,
} from '@hashgraphonline/standards-agent-kit';
import { Tool } from '@langchain/core/tools';
import { HcsBuilder } from '../builders/hcs/hcs-builder';
import { HtsBuilder } from '../builders/hts/hts-builder';
import { AccountBuilder } from '../builders/account/account-builder';
import { ScsBuilder } from '../builders/scs/scs-builder';
import { FileBuilder } from '../builders/file/file-builder';
import { ExecuteResult } from '../builders/base-service-builder';
import { BigNumber } from 'bignumber.js';
import { createHederaTools } from '../langchain';

interface PluginConfig {
  directories?: string[];
  packages?: string[];
  appConfig?: Record<string, any> | undefined;
}

/**
 * HederaAgentKit provides a simplified interface for interacting with the Hedera network,
 * abstracting away the complexities of the underlying SDK for common use cases.
 * It supports various operations related to HCS, HTS, and HBAR transfers through a Signer and Builders.
 * The kit must be initialized using the async `initialize()` method before its tools can be accessed.
 */
export class HederaAgentKit {
  public readonly client: Client;
  public readonly network: SignerHederaNetworkType;
  public readonly signer: AbstractSigner;
  public readonly mirrorNode: HederaMirrorNode;
  private loadedPlugins: IPlugin[];
  private aggregatedTools: Tool[];
  private pluginConfigInternal?: PluginConfig | undefined;
  private isInitialized: boolean = false;
  public readonly logger: StandardsSdkLogger;

  constructor(
    signer: AbstractSigner,
    pluginConfigInput: PluginConfig | undefined
  ) {
    this.signer = signer;
    this.network = this.signer.getNetwork();
    this.logger = new StandardsSdkLogger({
      level: 'info',
      module: 'HederaAgentKit',
    });

    if (this.network === 'mainnet') {
      this.client = Client.forMainnet();
    } else if (this.network === 'testnet') {
      this.client = Client.forTestnet();
    } else {
      const exhaustiveCheck: never = this.network;
      throw new Error(`Unsupported network type: ${exhaustiveCheck}`);
    }
    this.client.setOperator(
      this.signer.getAccountId(),
      this.signer.getOperatorPrivateKey()
    );

    this.mirrorNode = new HederaMirrorNode(
      this.network,
      new StandardsSdkLogger({
        level: 'info',
        module: 'HederaAgentKit-MirrorNode',
      })
    );

    this.pluginConfigInternal = pluginConfigInput;
    this.loadedPlugins = [];
    this.aggregatedTools = [];
  }

  /**
   * Initializes the HederaAgentKit, including loading any configured plugins and aggregating tools.
   * This method must be called before `getAggregatedLangChainTools()` can be used.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('HederaAgentKit is already initialized.');
      return;
    }

    this.loadedPlugins = [];

    const contextForLoadedPlugins: StandardsAgentKitPluginContext = {
      logger: this.logger as any,
      client: this as any,
      config: this.pluginConfigInternal?.appConfig || {},
    };

    if (this.pluginConfigInternal?.directories) {
      for (const dir of this.pluginConfigInternal.directories) {
        try {
          this.logger.info(`Loading plugins from directory: ${dir}`);
          const plugin = await PluginLoader.loadFromDirectory(
            dir,
            contextForLoadedPlugins
          );
          this.loadedPlugins.push(plugin);
          this.logger.info(
            `Successfully loaded plugin: ${plugin.name} from ${dir}`
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to load plugin from directory ${dir}: ${error.message}`
          );
        }
      }
    }

    if (this.pluginConfigInternal?.packages) {
      for (const pkg of this.pluginConfigInternal.packages) {
        try {
          this.logger.info(`Loading plugin from package: ${pkg}`);
          const plugin = await PluginLoader.loadFromPackage(
            pkg,
            contextForLoadedPlugins
          );
          this.loadedPlugins.push(plugin);
          this.logger.info(
            `Successfully loaded plugin: ${plugin.name} from package ${pkg}`
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to load plugin from package ${pkg}: ${error.message}`
          );
        }
      }
    }

    const coreKitTools = await createHederaTools(this);
    const pluginTools: Tool[] = [];
    const hcs10Tools: Tool[] = [];

    this.aggregatedTools = [
      ...coreKitTools,
      ...hcs10Tools,
      ...pluginTools,
    ] as unknown as Tool[];
    this.isInitialized = true;
    this.logger.info(
      'HederaAgentKit initialized successfully with all tools aggregated.'
    );
  }

  public async getHbarBalance(
    accountIdInput: AccountId | string
  ): Promise<number> {
    const accountId =
      typeof accountIdInput === 'string'
        ? AccountId.fromString(accountIdInput)
        : accountIdInput;
    const balanceQuery = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(this.client);
    return balanceQuery.hbars.toBigNumber().toNumber();
  }

  public async getHtsTokenBalance(
    tokenIdInput: TokenId | string,
    accountIdInput: AccountId | string
  ): Promise<number> {
    const accountId =
      typeof accountIdInput === 'string'
        ? AccountId.fromString(accountIdInput)
        : accountIdInput;
    const tokenId =
      typeof tokenIdInput === 'string'
        ? TokenId.fromString(tokenIdInput)
        : tokenIdInput;
    return get_hts_balance(
      tokenId.toString(),
      this.network as KitHederaNetworkType,
      accountId.toString()
    );
  }

  public async getAllTokensBalances(
    accountIdInput: AccountId | string
  ): Promise<DetailedTokenBalance[]> {
    const accountId =
      typeof accountIdInput === 'string'
        ? AccountId.fromString(accountIdInput)
        : accountIdInput;
    this.logger.info(
      `Fetching all token balances for account ${accountId.toString()}`
    );

    try {
      const accountInfo = await this.mirrorNode.requestAccount(
        accountId.toString()
      );
      if (!accountInfo || !accountInfo.balance || !accountInfo.balance.tokens) {
        this.logger.warn(
          `No token balances found for account ${accountId.toString()} or account info is incomplete.`
        );
        return [];
      }

      const detailedBalances: DetailedTokenBalance[] = [];

      for (const tokenEntry of accountInfo.balance.tokens) {
        const tokenIdString = tokenEntry.token_id;
        const balanceInSmallestUnit = tokenEntry.balance;

        const tokenDetails = await this.getHtsTokenDetails(tokenIdString);

        if (tokenDetails) {
          const decimals = parseInt(tokenDetails.decimals || '0');
          const balanceBigNumber = new BigNumber(balanceInSmallestUnit);
          const displayBalance = balanceBigNumber.shiftedBy(-decimals);

          detailedBalances.push({
            tokenId: tokenIdString,
            tokenSymbol: tokenDetails.symbol || '',
            tokenName: tokenDetails.name || '',
            tokenDecimals: tokenDetails.decimals || '0',
            balance: balanceInSmallestUnit,
            balanceInDisplayUnit: displayBalance,
          });
        } else {
          this.logger.warn(
            `Could not fetch details for token ${tokenIdString} while getting all balances for ${accountId.toString()}. Skipping this token.`
          );
          detailedBalances.push({
            tokenId: tokenIdString,
            tokenSymbol: 'UNKNOWN',
            tokenName: 'Unknown Token',
            tokenDecimals: '0',
            balance: balanceInSmallestUnit,
            balanceInDisplayUnit: new BigNumber(balanceInSmallestUnit),
          });
        }
      }
      return detailedBalances;
    } catch (error: any) {
      this.logger.error(
        `Failed to get all token balances for ${accountId.toString()}: ${
          error.message
        }`
      );
      throw error;
    }
  }

  /**
   * Retrieves detailed information about a specific HTS token.
   * @param {TokenId | string} tokenIdInput - The token ID or its string representation.
   * @returns {Promise<HtsTokenDetails>} A promise that resolves to the token details.
   */
  public async getHtsTokenDetails(
    tokenIdInput: TokenId | string
  ): Promise<HtsTokenDetails> {
    const tokenId =
      typeof tokenIdInput === 'string'
        ? TokenId.fromString(tokenIdInput)
        : tokenIdInput;
    this.logger.info(
      `Fetching token info for ${tokenId.toString()} using imported get_hts_token_details`
    );
    return get_hts_token_details(
      tokenId.toString(),
      this.network as KitHederaNetworkType
    );
  }

  public async getTokenHolders(
    tokenIdInput: TokenId | string,
    threshold?: number
  ): Promise<Array<TokenBalance>> {
    const tokenId =
      typeof tokenIdInput === 'string'
        ? TokenId.fromString(tokenIdInput)
        : tokenIdInput;
    return get_token_holders(
      tokenId.toString(),
      this.network as KitHederaNetworkType,
      threshold
    );
  }

  public async getPendingAirdrops(
    accountIdInput: AccountId | string
  ): Promise<Airdrop[]> {
    const accountId =
      typeof accountIdInput === 'string'
        ? AccountId.fromString(accountIdInput)
        : accountIdInput;
    return get_pending_airdrops(
      this.network as KitHederaNetworkType,
      accountId.toString()
    );
  }

  /**
   * Retrieves information about a specific HCS topic from the mirror node.
   * @param {string} topicIdString - The topic ID string (e.g., "0.0.xxxx").
   * @returns {Promise<StandardsSdkTopicResponse | null>} A promise that resolves to the topic information from the standards-sdk.
   */
  public async getTopicInfo(
    topicIdInput: TopicId | string
  ): Promise<StandardsSdkTopicResponse | null> {
    const topicId =
      typeof topicIdInput === 'string'
        ? TopicId.fromString(topicIdInput)
        : topicIdInput;
    this.logger.info(
      `Fetching topic info for ${topicId.toString()} using HederaAgentKit.mirrorNode`
    );
    try {
      const topicInfo = await this.mirrorNode.getTopicInfo(topicId.toString());
      return topicInfo;
    } catch (error: any) {
      this.logger.error(
        `Failed to get topic info for ${topicId.toString()}: ${error.message}`
      );
      if (error.message && error.message.toLowerCase().includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Retrieves parsed HCS-10 style messages for a specific HCS topic from the mirror node.
   * Note: This returns messages parsed according to HCS-10 conventions (e.g., JSON payloads),
   * not the raw mirror node message format.
   * @param {string} topicIdString - The topic ID string (e.g., "0.0.xxxx").
   * @param {number} [lowerTimestamp] - Optional: This implementation currently does not filter by timestamp if using standards-sdk's getTopicMessages, which fetches all and parses.
   * @param {number} [upperTimestamp] - Optional: Timestamp filtering would need to be post-fetch if not supported by the underlying method.
   * @returns {Promise<StandardsSdkHCSMessage[]>} A promise that resolves to an array of HCS-10 style messages.
   * @throws {Error} If the mirror node request fails.
   */
  public async getTopicMessages(
    topicIdInput: TopicId | string,
    lowerTimestamp?: number,
    upperTimestamp?: number
  ): Promise<Array<HCSMessage>> {
    const topicId =
      typeof topicIdInput === 'string'
        ? TopicId.fromString(topicIdInput)
        : topicIdInput;
    return get_topic_messages(
      topicId,
      this.network as KitHederaNetworkType,
      lowerTimestamp,
      upperTimestamp
    );
  }

  public async getOperator(): Promise<{ id: AccountId; publicKey: PublicKey }> {
    return {
      id: this.signer.getAccountId(),
      publicKey: await this.signer.getPublicKey(),
    };
  }

  /**
   * Retrieves the aggregated list of LangChain tools from the kit, core tools, and plugins.
   * The HederaAgentKit instance must be initialized via `await kit.initialize()` before calling this method.
   * @returns {Tool[]} An array of LangChain Tool objects.
   * @throws {Error} If the kit has not been initialized.
   */
  public getAggregatedLangChainTools(): Tool[] {
    if (!this.isInitialized) {
      throw new Error(
        'HederaAgentKit not initialized. Call await kit.initialize() before accessing tools.'
      );
    }
    return this.aggregatedTools;
  }

  /**
   * Provides access to the Hedera Consensus Service (HCS) builder.
   * @returns {HcsBuilder} An instance of HcsBuilder.
   * @throws {Error} If HederaAgentKit has not been initialized via `await initialize()`.
   */
  public hcs(): HcsBuilder {
    if (!this.isInitialized) {
      throw new Error(
        'HederaAgentKit not initialized. Call await kit.initialize() before using service builders.'
      );
    }
    return new HcsBuilder(this.signer, this.client);
  }

  /**
   * Provides access to the Hedera Token Service (HTS) builder.
   * @returns {HtsBuilder} An instance of HtsBuilder.
   * @throws {Error} If HederaAgentKit has not been initialized via `await initialize()`.
   */
  public hts(): HtsBuilder {
    if (!this.isInitialized) {
      throw new Error(
        'HederaAgentKit not initialized. Call await kit.initialize() before using service builders.'
      );
    }
    return new HtsBuilder(this.signer, this.client);
  }

  /**
   * Provides access to the Hedera Account Service builder.
   * @returns {AccountBuilder} An instance of AccountBuilder.
   * @throws {Error} If HederaAgentKit has not been initialized via `await initialize()`.
   */
  public accounts(): AccountBuilder {
    if (!this.isInitialized) {
      throw new Error(
        'HederaAgentKit not initialized. Call await kit.initialize() before using service builders.'
      );
    }
    return new AccountBuilder(this.signer, this.client);
  }

  /**
   * Provides access to the Hedera Smart Contract Service (SCS) builder.
   * @returns {ScsBuilder} An instance of ScsBuilder.
   * @throws {Error} If HederaAgentKit has not been initialized via `await initialize()`.
   */
  public scs(): ScsBuilder {
    if (!this.isInitialized) {
      throw new Error(
        'HederaAgentKit not initialized. Call await kit.initialize() before using service builders.'
      );
    }
    return new ScsBuilder(this.signer, this.client);
  }

  /**
   * Provides access to the Hedera File Service (HFS) builder.
   * @returns {FileBuilder} An instance of FileBuilder.
   * @throws {Error} If HederaAgentKit has not been initialized via `await initialize()`.
   */
  public fs(): FileBuilder {
    if (!this.isInitialized) {
      throw new Error(
        'HederaAgentKit not initialized. Call await kit.initialize() before using service builders.'
      );
    }
    return new FileBuilder(this.signer, this.client);
  }

  /**
   * Retrieves the transaction receipt for a given transaction ID string.
   * @param {string} transactionIdString - The transaction ID (e.g., "0.0.xxxx@16666666.77777777").
   * @returns {Promise<TransactionReceipt>} A promise that resolves to the TransactionReceipt.
   * @throws {Error} If the transaction ID is invalid or receipt cannot be fetched.
   */
  public async getTransactionReceipt(
    transactionIdInput: TransactionId | string
  ): Promise<TransactionReceipt> {
    const transactionId =
      typeof transactionIdInput === 'string'
        ? TransactionId.fromString(transactionIdInput)
        : transactionIdInput;
    try {
      return await transactionId.getReceipt(this.client);
    } catch (error: any) {
      this.logger.error(
        `Failed to get transaction receipt for ${transactionId.toString()}: ${
          error.message
        }`
      );
      throw error;
    }
  }

  public async getAccountInfo(
    accountIdInput: AccountId | string
  ): Promise<StandardsSdkAccountResponse> {
    const accountId =
      typeof accountIdInput === 'string'
        ? AccountId.fromString(accountIdInput)
        : accountIdInput;
    this.logger.info(
      `Fetching account info for ${accountId.toString()} using HederaAgentKit.mirrorNode`
    );
    try {
      const accountInfo = await this.mirrorNode.requestAccount(
        accountId.toString()
      );
      return accountInfo;
    } catch (error: any) {
      this.logger.error(
        `Failed to get account info for ${accountId.toString()}: ${
          error.message
        }`
      );
      throw error;
    }
  }

  /**
   * Signs a scheduled transaction.
   * The transaction is signed by the operator configured in the current signer.
   * @param {SignScheduledTransactionParams} params - Parameters for the ScheduleSign transaction.
   * @returns {Promise<ExecuteResult>} A promise that resolves to an object indicating success, receipt, and transactionId.
   * @throws {Error} If the execution fails.
   */
  public async signScheduledTransaction(
    params: SignScheduledTransactionParams
  ): Promise<ExecuteResult> {
    if (!this.isInitialized) {
      throw new Error(
        'HederaAgentKit not initialized. Call await kit.initialize() first.'
      );
    }
    this.logger.info(
      `Attempting to sign scheduled transaction: ${params.scheduleId.toString()}`
    );

    const scheduleId =
      typeof params.scheduleId === 'string'
        ? ScheduleId.fromString(params.scheduleId)
        : params.scheduleId;

    const transaction = new ScheduleSignTransaction().setScheduleId(scheduleId);

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    let transactionIdToReport: string | undefined;
    if (!transaction.transactionId) {
      transaction.freezeWith(this.client);
    }
    transactionIdToReport = transaction.transactionId?.toString();

    try {
      const receipt = await this.signer.signAndExecuteTransaction(transaction);

      return {
        success: true,
        receipt: receipt,
        transactionId: transactionIdToReport,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to sign scheduled transaction ${params.scheduleId.toString()}: ${
          error.message
        }`
      );
      return {
        success: false,
        error:
          error.message ||
          'An unknown error occurred during ScheduleSign transaction.',
        transactionId: transactionIdToReport,
      };
    }
  }
}

export default HederaAgentKit;
