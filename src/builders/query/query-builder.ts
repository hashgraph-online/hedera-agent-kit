import {
  HederaMirrorNode,
  TopicResponse,
  CustomFees,
  TokenInfoResponse,
  HCSMessage,
  AccountResponse,
  ScheduleInfo,
  Transaction as HederaTransaction,
  AccountTokenBalance,
  NftDetail,
  NftInfo,
  ContractCallQueryResponse,
  TokenAirdrop,
  Block,
  ContractResult,
  ContractLog,
  ContractAction,
  NetworkStake,
  NetworkSupply,
  ContractEntity,
  ContractState,
  NetworkInfo,
  NetworkFees,
  OpcodesResponse,
} from '@hashgraphonline/standards-sdk';
import { HederaAgentKit } from '../../agent';
import { TopicId, AccountId, PublicKey } from '@hashgraph/sdk';

/**
 * Utility function to filter out undefined values from an object
 */
function filterUndefined<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const filtered: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (filtered as Record<string, unknown>)[key] = value;
    }
  }
  return filtered;
}

/**
 * Builder class for Hedera query operations.
 * Provides a fluent interface for querying the Hedera network via Mirror Node.
 */
export class QueryBuilder {
  private hederaKit: HederaAgentKit;
  private mirrorNode: HederaMirrorNode;

  constructor(hederaKit: HederaAgentKit) {
    this.hederaKit = hederaKit;
    this.mirrorNode = hederaKit.mirrorNode;
  }

  /**
   * Get topic information for a given topic ID
   */
  async getTopicInfo(topicId: string | TopicId): Promise<TopicResponse> {
    const topicIdString =
      typeof topicId === 'string' ? topicId : topicId.toString();
    return await this.mirrorNode.getTopicInfo(topicIdString);
  }

  /**
   * Get messages for a given topic ID
   */
  async getTopicMessages(topicId: string | TopicId): Promise<HCSMessage[]> {
    const topicIdString =
      typeof topicId === 'string' ? topicId : topicId.toString();
    return await this.mirrorNode.getTopicMessages(topicIdString);
  }

  /**
   * Get filtered topic messages with optional parameters
   */
  async getTopicMessagesByFilter(
    topicId: string | TopicId,
    options?: {
      sequenceNumber?: string;
      startTime?: string;
      endTime?: string;
      limit?: number;
      order?: 'asc' | 'desc';
    }
  ): Promise<HCSMessage[] | null> {
    const topicIdString =
      typeof topicId === 'string' ? topicId : topicId.toString();
    return await this.mirrorNode.getTopicMessagesByFilter(
      topicIdString,
      options
    );
  }

  /**
   * Get account information for a given account ID
   */
  async getAccountInfo(
    accountId: string | AccountId
  ): Promise<AccountResponse> {
    const accountIdString =
      typeof accountId === 'string' ? accountId : accountId.toString();
    return await this.mirrorNode.requestAccount(accountIdString);
  }

  /**
   * Get account balance in HBAR for a given account ID
   */
  async getAccountBalance(
    accountId: string | AccountId
  ): Promise<number | null> {
    const accountIdString =
      typeof accountId === 'string' ? accountId : accountId.toString();
    return await this.mirrorNode.getAccountBalance(accountIdString);
  }

  /**
   * Get account memo for a given account ID
   */
  async getAccountMemo(accountId: string | AccountId): Promise<string | null> {
    const accountIdString =
      typeof accountId === 'string' ? accountId : accountId.toString();
    return await this.mirrorNode.getAccountMemo(accountIdString);
  }

  /**
   * Get token information for a given token ID
   */
  async getTokenInfo(tokenId: string): Promise<TokenInfoResponse | null> {
    return await this.mirrorNode.getTokenInfo(tokenId);
  }

  /**
   * Get token balances for a given account ID
   */
  async getAccountTokens(
    accountId: string | AccountId,
    limit: number = 100
  ): Promise<AccountTokenBalance[] | null> {
    const accountIdString =
      typeof accountId === 'string' ? accountId : accountId.toString();
    return await this.mirrorNode.getAccountTokens(accountIdString, limit);
  }

  /**
   * Get NFTs for a given account ID
   */
  async getAccountNfts(
    accountId: string | AccountId,
    tokenId?: string,
    limit: number = 100
  ): Promise<NftDetail[] | null> {
    const accountIdString =
      typeof accountId === 'string' ? accountId : accountId.toString();
    return await this.mirrorNode.getAccountNfts(
      accountIdString,
      tokenId,
      limit
    );
  }

  /**
   * Validate NFT ownership
   */
  async validateNftOwnership(
    accountId: string | AccountId,
    tokenId: string,
    serialNumber: number
  ): Promise<NftDetail | null> {
    const accountIdString =
      typeof accountId === 'string' ? accountId : accountId.toString();
    return await this.mirrorNode.validateNFTOwnership(
      accountIdString,
      tokenId,
      serialNumber
    );
  }

  /**
   * Get transaction details by ID or hash
   */
  async getTransaction(
    transactionIdOrHash: string
  ): Promise<HederaTransaction | null> {
    return await this.mirrorNode.getTransaction(transactionIdOrHash);
  }

  /**
   * Get transaction details by consensus timestamp
   */
  async getTransactionByTimestamp(
    timestamp: string
  ): Promise<HederaTransaction[]> {
    return await this.mirrorNode.getTransactionByTimestamp(timestamp);
  }

  /**
   * Get schedule information for a given schedule ID
   */
  async getScheduleInfo(scheduleId: string): Promise<ScheduleInfo | null> {
    return await this.mirrorNode.getScheduleInfo(scheduleId);
  }

  /**
   * Get scheduled transaction status
   */
  async getScheduledTransactionStatus(scheduleId: string): Promise<{
    executed: boolean;
    executedDate?: Date;
    deleted: boolean;
  }> {
    return await this.mirrorNode.getScheduledTransactionStatus(scheduleId);
  }

  /**
   * Get HBAR price for a given date
   */
  async getHbarPrice(date: Date): Promise<number | null> {
    return await this.mirrorNode.getHBARPrice(date);
  }

  /**
   * Read smart contract query (view/pure functions)
   */
  async readSmartContract(
    contractIdOrAddress: string,
    functionSelector: string,
    payerAccountId: string | AccountId,
    options?: {
      estimate?: boolean;
      block?: string;
      value?: number;
      gas?: number;
      gasPrice?: number;
    }
  ): Promise<ContractCallQueryResponse | null> {
    const payerIdString =
      typeof payerAccountId === 'string'
        ? payerAccountId
        : payerAccountId.toString();
    return await this.mirrorNode.readSmartContractQuery(
      contractIdOrAddress,
      functionSelector,
      payerIdString,
      options
    );
  }

  /**
   * Get public key for a given account ID
   */
  async getPublicKey(accountId: string | AccountId): Promise<PublicKey> {
    const accountIdString =
      typeof accountId === 'string' ? accountId : accountId.toString();
    return await this.mirrorNode.getPublicKey(accountIdString);
  }

  /**
   * Get custom fees for a given topic ID
   */
  async getTopicFees(topicId: string | TopicId): Promise<CustomFees | null> {
    const topicIdString =
      typeof topicId === 'string' ? topicId : topicId.toString();
    return await this.mirrorNode.getTopicFees(topicIdString);
  }

  /**
   * Check if a user has access to a given key list
   */
  async checkKeyListAccess(
    keyBytes: Buffer,
    userPublicKey: PublicKey
  ): Promise<boolean> {
    return await this.mirrorNode.checkKeyListAccess(keyBytes, userPublicKey);
  }

  /**
   * Get outstanding token airdrops sent by an account
   */
  async getOutstandingTokenAirdrops(
    accountIdOrArgs:
      | string
      | AccountId
      | {
          accountId: string;
          limit?: number | undefined;
          order?: 'asc' | 'desc' | undefined;
          receiverId?: string | undefined;
          serialNumber?: string | undefined;
          tokenId?: string | undefined;
        },
    options?: {
      limit?: number;
      order?: 'asc' | 'desc';
      receiverId?: string;
      serialNumber?: string;
      tokenId?: string;
    }
  ): Promise<TokenAirdrop[] | null> {
    let accountIdString: string;
    let finalOptions: typeof options;

    if (typeof accountIdOrArgs === 'object' && 'accountId' in accountIdOrArgs) {
      accountIdString = accountIdOrArgs.accountId;
      finalOptions = filterUndefined({
        limit: accountIdOrArgs.limit,
        order: accountIdOrArgs.order,
        receiverId: accountIdOrArgs.receiverId,
        serialNumber: accountIdOrArgs.serialNumber,
        tokenId: accountIdOrArgs.tokenId,
      }) as typeof options;
    } else {
      accountIdString =
        typeof accountIdOrArgs === 'string'
          ? accountIdOrArgs
          : accountIdOrArgs.toString();
      finalOptions = options;
    }

    if (!finalOptions) {
      return await this.mirrorNode.getOutstandingTokenAirdrops(accountIdString);
    }

    const filteredOptions = filterUndefined(finalOptions);
    const hasFilters = Object.keys(filteredOptions).length > 0;
    return await this.mirrorNode.getOutstandingTokenAirdrops(
      accountIdString,
      hasFilters ? filteredOptions : undefined
    );
  }

  /**
   * Get pending token airdrops received by an account
   */
  async getPendingTokenAirdrops(
    accountIdOrArgs:
      | string
      | AccountId
      | {
          accountId: string;
          limit?: number | undefined;
          order?: 'asc' | 'desc' | undefined;
          senderId?: string | undefined;
          serialNumber?: string | undefined;
          tokenId?: string | undefined;
        },
    options?: {
      limit?: number;
      order?: 'asc' | 'desc';
      senderId?: string;
      serialNumber?: string;
      tokenId?: string;
    }
  ): Promise<TokenAirdrop[] | null> {
    let accountIdString: string;
    let finalOptions: typeof options;

    if (typeof accountIdOrArgs === 'object' && 'accountId' in accountIdOrArgs) {
      accountIdString = accountIdOrArgs.accountId;
      finalOptions = filterUndefined({
        limit: accountIdOrArgs.limit,
        order: accountIdOrArgs.order,
        senderId: accountIdOrArgs.senderId,
        serialNumber: accountIdOrArgs.serialNumber,
        tokenId: accountIdOrArgs.tokenId,
      }) as typeof options;
    } else {
      accountIdString =
        typeof accountIdOrArgs === 'string'
          ? accountIdOrArgs
          : accountIdOrArgs.toString();
      finalOptions = options;
    }

    if (!finalOptions) {
      return await this.mirrorNode.getPendingTokenAirdrops(accountIdString);
    }

    const filteredOptions = filterUndefined(finalOptions);
    const hasFilters = Object.keys(filteredOptions).length > 0;
    return await this.mirrorNode.getPendingTokenAirdrops(
      accountIdString,
      hasFilters ? filteredOptions : undefined
    );
  }

  /**
   * Get blocks with optional filtering
   */
  async getBlocks(options?: {
    blockNumber?: string | undefined;
    timestamp?: string | undefined;
    limit?: number | undefined;
    order?: 'asc' | 'desc' | undefined;
  }): Promise<Block[] | null> {
    if (!options) {
      return await this.mirrorNode.getBlocks();
    }

    const filteredOptions = filterUndefined(options) as {
      blockNumber?: string;
      timestamp?: string;
      limit?: number;
      order?: 'asc' | 'desc';
    };
    const hasFilters = Object.keys(filteredOptions).length > 0;
    return await this.mirrorNode.getBlocks(
      hasFilters ? filteredOptions : undefined
    );
  }

  /**
   * Get a specific block by number or hash
   */
  async getBlock(blockNumberOrHash: string): Promise<Block | null> {
    return await this.mirrorNode.getBlock(blockNumberOrHash);
  }

  /**
   * Get contract results with optional filtering
   */
  async getContractResults(options?: {
    from?: string;
    blockHash?: string;
    blockNumber?: string;
    internal?: boolean;
    limit?: number;
    order?: 'asc' | 'desc';
    timestamp?: string;
    transactionIndex?: number;
  }): Promise<ContractResult[] | null> {
    return await this.mirrorNode.getContractResults(options);
  }

  /**
   * Get contract result by transaction ID
   */
  async getContractResult(
    transactionIdOrHash: string,
    nonce?: number
  ): Promise<ContractResult | null> {
    return await this.mirrorNode.getContractResult(transactionIdOrHash, nonce);
  }

  /**
   * Get contract logs with optional filtering
   */
  async getContractLogs(options?: {
    index?: string;
    limit?: number;
    order?: 'asc' | 'desc';
    timestamp?: string;
    topic0?: string;
    topic1?: string;
    topic2?: string;
    topic3?: string;
    transactionHash?: string;
  }): Promise<ContractLog[] | null> {
    return await this.mirrorNode.getContractLogs(options);
  }

  /**
   * Get contract actions for a transaction
   */
  async getContractActions(
    transactionIdOrHash: string,
    options?: {
      index?: string;
      limit?: number;
      order?: 'asc' | 'desc';
    }
  ): Promise<ContractAction[] | null> {
    return await this.mirrorNode.getContractActions(
      transactionIdOrHash,
      options
    );
  }

  /**
   * Get NFT information by token ID and serial number
   */
  async getNftInfo(
    tokenId: string,
    serialNumber: number
  ): Promise<NftInfo | null> {
    return await this.mirrorNode.getNftInfo(tokenId, serialNumber);
  }

  /**
   * Get all NFTs for a token ID
   */
  async getNftsByToken(
    tokenId: string,
    options?: {
      accountId?: string;
      limit?: number;
      order?: 'asc' | 'desc';
      serialNumber?: string;
    }
  ): Promise<NftInfo[] | null> {
    return await this.mirrorNode.getNftsByToken(tokenId, options);
  }

  /**
   * Get network stake information
   */
  async getNetworkStake(timestamp?: string): Promise<NetworkStake | null> {
    return await this.mirrorNode.getNetworkStake(timestamp);
  }

  /**
   * Get network supply information
   */
  async getNetworkSupply(timestamp?: string): Promise<NetworkSupply | null> {
    return await this.mirrorNode.getNetworkSupply(timestamp);
  }

  /**
   * Get contract entities from the network
   */
  async getContracts(options?: {
    contractId?: string | undefined;
    limit?: number | undefined;
    order?: 'asc' | 'desc' | undefined;
  }): Promise<ContractEntity[] | null> {
    if (!options) {
      return await this.mirrorNode.getContracts();
    }

    const filteredOptions = filterUndefined(options) as {
      contractId?: string;
      limit?: number;
      order?: 'asc' | 'desc';
    };
    const hasFilters = Object.keys(filteredOptions).length > 0;
    return await this.mirrorNode.getContracts(
      hasFilters ? filteredOptions : undefined
    );
  }

  /**
   * Get a specific contract by ID or address
   */
  async getContract(
    contractIdOrAddress: string,
    timestamp?: string,
    includeBytecode?: boolean
  ): Promise<ContractEntity | null> {
    const response = await this.mirrorNode.getContract(
      contractIdOrAddress,
      timestamp
    );
    if (!includeBytecode) {
      delete response?.bytecode;
    }
    return response;
  }

  /**
   * Get contract results by contract
   */
  async getContractResultsByContract(
    contractIdOrAddress: string,
    options?: {
      blockHash?: string;
      blockNumber?: string;
      from?: string;
      internal?: boolean;
      limit?: number;
      order?: 'asc' | 'desc';
      timestamp?: string;
      transactionIndex?: number;
    }
  ): Promise<ContractResult[] | null> {
    return await this.mirrorNode.getContractResultsByContract(
      contractIdOrAddress,
      options
    );
  }

  /**
   * Get contract state for a specific contract
   */
  async getContractState(
    contractIdOrAddress: string,
    options?: {
      limit?: number;
      order?: 'asc' | 'desc';
      slot?: string;
      timestamp?: string;
    }
  ): Promise<ContractState[] | null> {
    return await this.mirrorNode.getContractState(contractIdOrAddress, options);
  }

  /**
   * Get contract logs by contract
   */
  async getContractLogsByContract(
    contractIdOrAddress: string,
    options?: {
      index?: string;
      limit?: number;
      order?: 'asc' | 'desc';
      timestamp?: string;
      topic0?: string;
      topic1?: string;
      topic2?: string;
      topic3?: string;
    }
  ): Promise<ContractLog[] | null> {
    return await this.mirrorNode.getContractLogsByContract(
      contractIdOrAddress,
      options
    );
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<NetworkInfo | null> {
    return await this.mirrorNode.getNetworkInfo();
  }

  /**
   * Get network fees
   */
  async getNetworkFees(timestamp?: string): Promise<NetworkFees | null> {
    return await this.mirrorNode.getNetworkFees(timestamp);
  }

  /**
   * Get opcode traces for a specific transaction
   */
  async getOpcodeTraces(
    transactionIdOrHash: string,
    options?: {
      stack?: boolean;
      memory?: boolean;
      storage?: boolean;
    }
  ): Promise<OpcodesResponse | null> {
    return await this.mirrorNode.getOpcodeTraces(transactionIdOrHash, options);
  }
}
