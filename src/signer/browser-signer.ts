import {
  AccountId,
  Transaction,
  TransactionReceipt,
  Signer as HederaSdkSigner,
  PrivateKey,
} from '@hashgraph/sdk';
import { AbstractSigner } from './abstract-signer';
import { HederaNetworkType } from '../types';
import { HashinalsWalletConnectSDK } from '@hashgraphonline/hashinal-wc';

/**
 * A signer implementation for browser environments that uses HashConnect for signing.
 * It delegates signing operations to an instance of HashinalsWalletConnectSDK.
 */
export class BrowserSigner extends AbstractSigner {
  private networkInternal: HederaNetworkType;
  private accountIdInternal: AccountId;
  private hwcSdk: HashinalsWalletConnectSDK;

  /**
   * Constructs a BrowserSigner instance.
   * @param {HashinalsWalletConnectSDK} hwcSdk - An initialized HashinalsWalletConnectSDK instance.
   * @param {HederaNetworkType} network - The Hedera network ('mainnet' or 'testnet').
   * @param {string | AccountId} accountId - The Hedera account ID this signer will represent (must be paired with hwcSdk).
   */
  constructor(
    hwcSdk: HashinalsWalletConnectSDK,
    network: HederaNetworkType,
    accountId: string | AccountId
  ) {
    super();
    this.hwcSdk = hwcSdk;
    this.networkInternal = network;
    this.accountIdInternal = AccountId.fromString(accountId.toString());

    const foundSigner = this.hwcSdk.dAppConnector?.signers?.find((s) => {
      const hederaSigner = s as HederaSdkSigner;
      const signerAccount = hederaSigner.getAccountId();
      if (signerAccount) {
        return signerAccount.toString() === this.accountIdInternal.toString();
      }
      return false;
    });

    if (!foundSigner) {
      throw new Error(
        `No HashConnect signer (HederaSdkSigner) could be found or initialized within HashinalsWalletConnectSDK for account ID ${this.accountIdInternal.toString()}. ` +
          `Ensure the account is paired and selected in HashPack for the dApp on network ${this.networkInternal}.`
      );
    }

    this.initializeMirrorNode(this.networkInternal, 'BrowserSigner');
  }

  /**
   * Retrieves the Hedera account ID associated with this signer.
   * @returns {AccountId} The Hedera AccountId object.
   */
  public getAccountId(): AccountId {
    return this.accountIdInternal;
  }

  /**
   * Signs and executes a Hedera transaction using the HashinalsWalletConnectSDK,
   * returning the transaction receipt. Transaction freezing is handled by HashinalsWalletConnectSDK.
   * @param {Transaction} transaction - The transaction to sign and execute.
   * @returns {Promise<TransactionReceipt>} A promise that resolves to the transaction receipt.
   * @throws {Error} If the transaction fails or is rejected.
   */
  public async signAndExecuteTransaction(
    transaction: Transaction
  ): Promise<TransactionReceipt> {
    const outcome = await this.hwcSdk.executeTransactionWithErrorHandling(
      transaction,
      false
    );

    if (outcome.error) {
      throw new Error(`Transaction failed: ${outcome.error}`);
    }

    if (outcome.result) {
      return outcome.result;
    }

    throw new Error(
      'Transaction execution with HashinalsWalletConnectSDK yielded no result or error.'
    );
  }

  /**
   * Retrieves the Hedera network type this signer is configured for.
   * @returns {HederaNetworkType} The configured Hedera network type ('mainnet' or 'testnet').
   */
  public getNetwork(): HederaNetworkType {
    return this.networkInternal;
  }

  /**
   * Retrieves the operator's private key.
   * For BrowserSigner, this is not available as signing is delegated to the user's wallet via WalletConnect.
   * @returns {string | PrivateKey} Throws an error as private key is not accessible.
   * @throws {Error} Always, as BrowserSigner does not hold private keys.
   */
  //@ts-ignore
  public getOperatorPrivateKey(): string | PrivateKey {
    throw new Error(
      "BrowserSigner does not have direct access to private keys. Signing is delegated to the user's wallet."
    );
  }

  /**
   * Retrieves the Hedera client instance.
   * @returns {Client} The Hedera client instance.
   */
  //@ts-ignore
  public getClient(): any {
    throw new Error('BrowserSigner does not have a Hedera client instance.');
  }
}
