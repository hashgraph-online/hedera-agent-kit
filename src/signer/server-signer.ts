import {
  AccountId,
  Client,
  PrivateKey,
  Transaction,
  TransactionResponse,
  TransactionReceipt,
} from '@hashgraph/sdk';
import {
  detectKeyTypeFromString,
  Logger,
} from '@hashgraphonline/standards-sdk';
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
  private keyType: 'ed25519' | 'ecdsa' = 'ed25519';
  private logger: Logger;
  private privateKeyString: string;
  private keyTypeVerified: boolean = false;

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
    this.networkInternal = network;
    this.logger = new Logger({ 
      module: 'ServerSigner', 
      level: process.env.DEBUG === 'true' ? 'debug' : 'warn' 
    });

    this.initializeMirrorNode(this.networkInternal, 'ServerSigner');

    if (network === 'mainnet') {
      this.client = Client.forMainnet();
    } else if (network === 'testnet') {
      this.client = Client.forTestnet();
    } else {
      throw new Error(
        `Unsupported Hedera network type specified: ${network}. Only 'mainnet' or 'testnet' are supported.`
      );
    }

    if (typeof privateKey === 'string') {
      this.privateKeyString = privateKey;
      try {
        const keyDetection = detectKeyTypeFromString(privateKey);
        this.privateKey = keyDetection.privateKey;
        this.keyType = keyDetection.detectedType;
        this.initializeOperator();
        this.logger.debug(`Detected key type from string: ${this.keyType}`);
      } catch (error: unknown) {
        this.logger.warn(
          'Failed to detect key type from private key format, will query mirror node',
          (error as Error).message
        );
        this.privateKey = PrivateKey.fromStringED25519(privateKey);
        this.keyType = 'ed25519';
      }
    } else {
      this.privateKey = privateKey;
      this.privateKeyString = privateKey.toString();
    }

    this.client.setOperator(this.accountIdInternal, this.privateKey);
  }

  /**
   * Initializes the operator by verifying the key type against the mirror node.
   * This follows the pattern from standards-sdk to ensure the correct key type is used.
   */
  private async initializeOperator(): Promise<void> {
    try {
      const account = await this.mirrorNode.requestAccount(
        this.accountIdInternal.toString()
      );
      const keyType = account?.key?._type;

      let actualKeyType: 'ed25519' | 'ecdsa' = 'ed25519';

      if (keyType?.includes('ECDSA')) {
        actualKeyType = 'ecdsa';
      } else if (keyType?.includes('ED25519')) {
        actualKeyType = 'ed25519';
      }

      if (actualKeyType !== this.keyType) {
        this.logger.debug(
          `Key type mismatch detected. String detection: ${this.keyType}, Mirror node: ${actualKeyType}. Using mirror node result.`
        );

        this.keyType = actualKeyType;

        if (this.privateKeyString) {
          this.privateKey =
            actualKeyType === 'ecdsa'
              ? PrivateKey.fromStringECDSA(this.privateKeyString)
              : PrivateKey.fromStringED25519(this.privateKeyString);

          this.client.setOperator(this.accountIdInternal, this.privateKey);

          this.logger.debug(
            `Updated operator with verified key type: ${this.keyType}`
          );
        }
      } else {
        this.logger.debug(`Key type verification successful: ${this.keyType}`);
      }
      this.keyTypeVerified = true;
    } catch (error) {
      this.logger.error(
        `Failed to verify key type from mirror node: ${
          (error as Error).message
        }`
      );
      this.keyTypeVerified = true;
    }
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
    const response: TransactionResponse = await transaction.execute(
      this.client
    );
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

  /**
   * Retrieves the key type of the operator's private key.
   * @returns {Promise<'ed25519' | 'ecdsa'>} The key type.
   */
  public async getKeyType(): Promise<'ed25519' | 'ecdsa'> {
    if (!this.keyTypeVerified && this.privateKeyString) {
      await this.initializeOperator();
    }
    return this.keyType;
  }

  /**
   * Retrieves the key type synchronously (without mirror node verification).
   * @returns {'ed25519' | 'ecdsa'} The key type.
   */
  public getKeyTypeSync(): 'ed25519' | 'ecdsa' {
    return this.keyType;
  }
}
