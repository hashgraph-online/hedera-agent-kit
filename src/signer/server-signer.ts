import {
  AccountId,
  Client,
  PrivateKey,
  Transaction,
  TransactionResponse,
  TransactionReceipt,
} from '@hashgraph/sdk';
import { AbstractSigner } from './abstract-signer';
import { HederaNetworkType } from '../types';

/**
 * A signer implementation for server-side environments that uses a private key for signing.
 * It directly interacts with the Hedera network using an operator-configured client.
 */
export class ServerSigner extends AbstractSigner {
  private client: Client;
  private accountIdInternal: AccountId;
  private privateKey: PrivateKey;
  private networkInternal: HederaNetworkType;

  /**
   * Constructs a ServerSigner instance.
   * @param {string | AccountId} accountId - The Hedera account ID.
   * @param {string | PrivateKey} privateKey - The private key for the account.
   * @param {HederaNetworkType} network - The Hedera network to connect to ('mainnet' or 'testnet').
   */
  constructor(
    accountId: string | AccountId,
    privateKey: string | PrivateKey,
    network: HederaNetworkType
  ) {
    super();
    this.accountIdInternal = AccountId.fromString(accountId.toString());
    this.privateKey = PrivateKey.fromString(privateKey.toString());
    this.networkInternal = network;

    if (network === 'mainnet') {
      this.client = Client.forMainnet();
    } else if (network === 'testnet') {
      this.client = Client.forTestnet();
    } else {
      throw new Error(
        `Unsupported Hedera network type specified: ${network}. Only 'mainnet' or 'testnet' are supported.`
      );
    }
    this.client.setOperator(this.accountIdInternal, this.privateKey);

    this.initializeMirrorNode(this.networkInternal, 'ServerSigner');
  }

  /**
   * Retrieves the Hedera account ID associated with this signer.
   * @returns {AccountId} The Hedera AccountId object.
   */
  public getAccountId(): AccountId {
    return this.accountIdInternal;
  }

  /**
   * Signs and executes a Hedera transaction using the configured client and private key,
   * and returns the transaction receipt.
   * @param {Transaction} transaction - The transaction to sign and execute.
   * @returns {Promise<TransactionReceipt>} A promise that resolves to the transaction receipt.
   */
  public async signAndExecuteTransaction(
    transaction: Transaction
  ): Promise<TransactionReceipt> {
    if (!transaction.isFrozen()) {
      if (transaction.transactionId) {
        await transaction.freezeWith(this.client);
      } else {
        await transaction.freezeWith(this.client);
      }
    }
    if (transaction.getSignatures().size === 0) {
      await transaction.sign(this.privateKey);
    }
    const response: TransactionResponse = await transaction.execute(this.client);
    return response.getReceipt(this.client);
  }

  /**
   * Retrieves the Hedera network type this signer is configured for.
   * @returns {HederaNetworkType} The configured Hedera network type ('mainnet' or 'testnet').
   */
  public getNetwork(): HederaNetworkType {
    return this.networkInternal;
  }

  /**
   * Retrieves the operator's private key associated with this signer.
   * @returns {PrivateKey} The Hedera PrivateKey object.
   */
  public getOperatorPrivateKey(): PrivateKey {
    return this.privateKey;
  }

  /**
   * Retrieves the client instance configured for this ServerSigner.
   * @returns {Client} The Hedera Client object.
   */
  public getClient(): Client {
    return this.client;
  }
}
