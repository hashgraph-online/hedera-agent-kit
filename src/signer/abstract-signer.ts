import {
  AccountId,
  PublicKey,
  Transaction,
  TransactionReceipt,
  PrivateKey,
  Client,
} from '@hashgraph/sdk';
import {
  HederaMirrorNode,
  Logger as StandardsSdkLogger,
  NetworkType as StandardsSdkNetworkType,
} from '@hashgraphonline/standards-sdk';
import { HederaNetworkType } from '../types';

/**
 * AbstractSigner provides a common interface and shared functionality for different signing mechanisms.
 * Concrete implementations will handle specifics for server-side, browser (WalletConnect), etc.
 */
export abstract class AbstractSigner {
  public mirrorNode!: HederaMirrorNode;

  /**
   * Retrieves the Hedera account ID associated with this signer.
   * This must be implemented by concrete classes.
   * @returns {AccountId} The Hedera AccountId object.
   */
  public abstract getAccountId(): AccountId;

  /**
   * Retrieves the public key associated with this signer's account using the Hedera Mirror Node.
   * This method relies on the `mirrorNode` property being initialized by the concrete signer.
   * @returns {Promise<PublicKey>} A promise that resolves to the Hedera PublicKey object.
   * @throws {Error} If the public key cannot be retrieved from the mirror node or if mirrorNode is not initialized.
   */
  public async getPublicKey(): Promise<PublicKey> {
    if (!this.mirrorNode) {
      throw new Error(
        'AbstractSigner: HederaMirrorNode has not been initialized by the concrete signer implementation. This is an internal error.'
      );
    }
    const accountIdToQuery = this.getAccountId();
    try {
      return await this.mirrorNode.getPublicKey(accountIdToQuery.toString());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to retrieve public key from mirror node for account ${accountIdToQuery.toString()}: ${errorMessage}`
      );
    }
  }

  /**
   * Signs and executes a Hedera transaction, returning its receipt.
   * Concrete implementations will manage their own client interactions for this process.
   * @param {Transaction} transaction - The transaction to sign and execute.
   * @returns {Promise<TransactionReceipt>} A promise that resolves to the transaction receipt.
   */
  public abstract signAndExecuteTransaction(
    transaction: Transaction
  ): Promise<TransactionReceipt>;

  /**
   * Retrieves the Hedera network type this signer is configured for.
   * This must be implemented by concrete classes.
   * @returns {HederaNetworkType} The configured Hedera network type ('mainnet' or 'testnet').
   */
  public abstract getNetwork(): HederaNetworkType;

  /**
   * Retrieves the operator's private key.
   * This is needed by HederaAgentKit to set the operator on its internal client.
   * Concrete implementations must provide this.
   * @returns {PrivateKey} The operator's private key.
   */
  public abstract getOperatorPrivateKey(): PrivateKey;

  /**
   * Retrieves the client instance configured for this signer.
   * This is needed for operations like freezing transactions with the correct payer.
   * @returns {Client} The Hedera Client object.
   */
  public abstract getClient(): Client;

  /**
   * Initializes the HederaMirrorNode instance for the signer.
   * Concrete classes must call this in their constructor.
   * @param {HederaNetworkType} network - The network for the mirror node.
   * @param {string} moduleName - A descriptive name for the logger module (e.g., 'ServerSigner', 'BrowserSigner').
   */
  protected initializeMirrorNode(
    network: HederaNetworkType,
    moduleName: string
  ): void {
    this.mirrorNode = new HederaMirrorNode(
      network as StandardsSdkNetworkType,
      new StandardsSdkLogger({
        level: 'info',
        module: `${moduleName}-MirrorNode`,
      })
    );
  }
}
