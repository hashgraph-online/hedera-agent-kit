import {
  AccountId,
  Client,
  CustomFee,
  PrivateKey,
  PublicKey,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
  TransactionReceipt,
  Transaction,
  TokenId,
  Long,
  TokenMintTransaction,
  TokenBurnTransaction,
  TransferTransaction,
  TokenAssociateTransaction,
  TokenDissociateTransaction,
  Hbar,
  TokenWipeTransaction,
  TokenFreezeTransaction,
  TokenUnfreezeTransaction,
  TokenGrantKycTransaction,
  TokenRevokeKycTransaction,
  TokenPauseTransaction,
  TokenUnpauseTransaction,
  TokenUpdateTransaction,
  TokenDeleteTransaction,
  TokenFeeScheduleUpdateTransaction,
  Timestamp,
  NftId,
  Key,
  TokenAirdropTransaction,
  TokenClaimAirdropTransaction,
  TokenCancelAirdropTransaction,
  TokenRejectTransaction,
  PendingAirdropId,
  KeyList,
} from '@hashgraph/sdk';
import BigNumber from 'bignumber.js';
import { AbstractSigner } from '../../signer/abstract-signer';
import {
  FTCreateParams,
  NFTCreateParams,
  MintFTParams,
  BurnFTParams,
  MintNFTParams,
  BurnNFTParams,
  TransferNFTParams,
  AssociateTokensParams,
  DissociateTokensParams,
  TransferTokensParams,
  FungibleTokenTransferSpec,
  NonFungibleTokenTransferSpec,
  WipeTokenAccountParams,
  FreezeTokenAccountParams,
  UnfreezeTokenAccountParams,
  GrantKycTokenParams,
  RevokeKycTokenParams,
  PauseTokenParams,
  UnpauseTokenParams,
  UpdateTokenParams,
  DeleteTokenParams,
  TokenFeeScheduleUpdateParams,
  AirdropTokenParams,
  AirdropRecipient,
  ClaimAirdropParams,
  CancelAirdropParams,
  RejectAirdropParams,
} from '../../types';
import { BaseServiceBuilder } from '../base-service-builder';
import { Buffer } from 'buffer';

const DEFAULT_AUTORENEW_PERIOD_SECONDS = 7776000;

/**
 * HtsBuilder facilitates the construction and execution of Hedera Token Service (HTS) transactions.
 */
export class HtsBuilder extends BaseServiceBuilder {
  /**
   * @param {AbstractSigner} signer
   * @param {Client} basicClient
   */
  constructor(signer: AbstractSigner, basicClient: Client) {
    super(signer, basicClient);
  }

  private parseKey(
    keyInput?: string | PublicKey | Key | null
  ): Key | undefined {
    if (keyInput === undefined || keyInput === null) {
      return undefined;
    }
    if (
      typeof keyInput === 'object' &&
      ('_key' in keyInput ||
        keyInput instanceof PublicKey ||
        keyInput instanceof PrivateKey ||
        keyInput instanceof KeyList)
    ) {
      return keyInput as Key;
    }
    if (typeof keyInput === 'string') {
      try {
        return PublicKey.fromString(keyInput);
      } catch (e) {
        try {
          return PrivateKey.fromString(keyInput).publicKey;
        } catch (e2) {
          this.logger.error(
            `Failed to parse key string as PublicKey or PrivateKey: ${keyInput.substring(
              0,
              30
            )}...`,
            { error1: (e as any).message, error2: (e2 as any).message }
          );
          throw new Error(
            `Invalid key string format: ${keyInput.substring(0, 30)}...`
          );
        }
      }
    }
    this.logger.warn(
      `parseKey received an object that is not an SDK Key instance and not a string: ${JSON.stringify(
        keyInput
      )}`
    );
    return undefined;
  }

  private parseAmount(amount?: number | string | Long | BigNumber): Long {
    if (amount === undefined) {
      return Long.fromNumber(0);
    }
    if (typeof amount === 'number') {
      return Long.fromNumber(amount);
    }
    if (typeof amount === 'string') {
      return Long.fromString(amount);
    }
    if (amount instanceof BigNumber) {
      return Long.fromString(amount.toString());
    }
    return amount;
  }

  /**
   * @param {FTCreateParams} params
   * @returns {this}
   * @throws {Error}
   */
  public createFungibleToken(params: FTCreateParams): this {
    const transaction = new TokenCreateTransaction()
      .setTokenName(params.tokenName)
      .setTokenSymbol(params.tokenSymbol)
      .setTreasuryAccountId(params.treasuryAccountId)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(params.supplyType)
      .setInitialSupply(this.parseAmount(params.initialSupply))
      .setDecimals(params.decimals);

    if (params.supplyType === TokenSupplyType.Finite && params.maxSupply) {
      transaction.setMaxSupply(this.parseAmount(params.maxSupply));
    }
    if (params.adminKey) {
      transaction.setAdminKey(this.parseKey(params.adminKey)!);
    }
    if (params.kycKey) {
      transaction.setKycKey(this.parseKey(params.kycKey)!);
    }
    if (params.freezeKey) {
      transaction.setFreezeKey(this.parseKey(params.freezeKey)!);
    }
    if (params.wipeKey) {
      transaction.setWipeKey(this.parseKey(params.wipeKey)!);
    }
    if (params.supplyKey) {
      transaction.setSupplyKey(this.parseKey(params.supplyKey)!);
    }
    if (params.feeScheduleKey) {
      transaction.setFeeScheduleKey(this.parseKey(params.feeScheduleKey)!);
    }
    if (params.pauseKey) {
      transaction.setPauseKey(this.parseKey(params.pauseKey)!);
    }
    if (params.memo) {
      transaction.setTokenMemo(params.memo);
    }
    if (params.customFees && params.customFees.length > 0) {
      transaction.setCustomFees(params.customFees);
    }
    if (params.autoRenewAccountId) {
      transaction.setAutoRenewAccountId(params.autoRenewAccountId);
    }
    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    } else if (params.autoRenewAccountId) {
      transaction.setAutoRenewPeriod(DEFAULT_AUTORENEW_PERIOD_SECONDS);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {NFTCreateParams} params
   * @returns {this}
   * @throws {Error}
   */
  public createNonFungibleToken(params: NFTCreateParams): this {
    const transaction = new TokenCreateTransaction()
      .setTokenName(params.tokenName)
      .setTokenSymbol(params.tokenSymbol)
      .setTreasuryAccountId(params.treasuryAccountId)
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(params.supplyType)
      .setInitialSupply(0)
      .setDecimals(0);

    if (params.supplyType === TokenSupplyType.Finite && params.maxSupply) {
      transaction.setMaxSupply(this.parseAmount(params.maxSupply));
    }
    if (params.adminKey) {
      transaction.setAdminKey(this.parseKey(params.adminKey)!);
    }
    if (params.kycKey) {
      transaction.setKycKey(this.parseKey(params.kycKey)!);
    }
    if (params.freezeKey) {
      transaction.setFreezeKey(this.parseKey(params.freezeKey)!);
    }
    if (params.wipeKey) {
      transaction.setWipeKey(this.parseKey(params.wipeKey)!);
    }
    if (params.supplyKey) {
      transaction.setSupplyKey(this.parseKey(params.supplyKey)!);
    }
    if (params.feeScheduleKey) {
      transaction.setFeeScheduleKey(this.parseKey(params.feeScheduleKey)!);
    }
    if (params.pauseKey) {
      transaction.setPauseKey(this.parseKey(params.pauseKey)!);
    }
    if (params.memo) {
      transaction.setTokenMemo(params.memo);
    }
    if (params.customFees && params.customFees.length > 0) {
      transaction.setCustomFees(params.customFees);
    }
    if (params.autoRenewAccountId) {
      transaction.setAutoRenewAccountId(params.autoRenewAccountId);
    }
    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    } else if (params.autoRenewAccountId) {
      transaction.setAutoRenewPeriod(DEFAULT_AUTORENEW_PERIOD_SECONDS);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {MintFTParams} params
   * @returns {this}
   */
  public mintFungibleToken(params: MintFTParams): this {
    const transaction = new TokenMintTransaction()
      .setTokenId(params.tokenId)
      .setAmount(this.parseAmount(params.amount));
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {BurnFTParams} params
   * @returns {this}
   */
  public burnFungibleToken(params: BurnFTParams): this {
    const transaction = new TokenBurnTransaction()
      .setTokenId(params.tokenId)
      .setAmount(this.parseAmount(params.amount));
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {MintNFTParams} params
   * @returns {this}
   * @throws {Error}
   */
  public mintNonFungibleToken(params: MintNFTParams): this {
    const transaction = new TokenMintTransaction()
      .setTokenId(params.tokenId)
      .setMetadata(
        params.metadata.map((m) => {
          if (typeof m === 'string') {
            return Buffer.from(m, 'utf8');
          }
          return m;
        })
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {BurnNFTParams} params
   * @returns {this}
   */
  public burnNonFungibleToken(params: BurnNFTParams): this {
    if (!params.serials || params.serials.length === 0) {
      throw new Error('Serial numbers are required to burn NFTs.');
    }
    const serialsAsLong = params.serials.map((s) => this.parseAmount(s));
    const transaction = new TokenBurnTransaction()
      .setTokenId(params.tokenId)
      .setSerials(serialsAsLong);
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {TransferNFTParams} params - Parameters for transferring a single NFT.
   * @returns {this}
   */
  public transferNft(params: TransferNFTParams): this {
    let transaction: TransferTransaction = new TransferTransaction();

    if (!params.isApproved) {
      transaction = transaction.addNftTransfer(
        params.nftId,
        params.senderAccountId,
        params.receiverAccountId
      );
    } else {
      transaction = transaction.addApprovedNftTransfer(
        params.nftId,
        params.senderAccountId,
        params.receiverAccountId
      );
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {AssociateTokensParams} params
   * @returns {this}
   */
  public associateTokens(params: AssociateTokensParams): this {
    const transaction = new TokenAssociateTransaction()
      .setAccountId(params.accountId)
      .setTokenIds(
        params.tokenIds.map((id) =>
          typeof id === 'string' ? TokenId.fromString(id) : id
        )
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {DissociateTokensParams} params
   * @returns {this}
   */
  public dissociateTokens(params: DissociateTokensParams): this {
    const transaction = new TokenDissociateTransaction()
      .setAccountId(params.accountId)
      .setTokenIds(
        params.tokenIds.map((id) =>
          typeof id === 'string' ? TokenId.fromString(id) : id
        )
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {TransferTokensParams} params - Parameters for transferring fungible tokens, NFTs, and/or HBAR.
   * @returns {this}
   */
  public transferTokens(params: TransferTokensParams): this {
    const transaction = new TransferTransaction();

    if (params.tokenTransfers && params.tokenTransfers.length > 0) {
      for (const transfer of params.tokenTransfers) {
        if (transfer.type === 'fungible') {
          const fungibleTransfer = transfer as FungibleTokenTransferSpec;
          transaction.addTokenTransfer(
            typeof fungibleTransfer.tokenId === 'string'
              ? TokenId.fromString(fungibleTransfer.tokenId)
              : fungibleTransfer.tokenId,
            fungibleTransfer.accountId,
            this.parseAmount(fungibleTransfer.amount)
          );
        } else if (transfer.type === 'nft') {
          const nftTransfer = transfer as NonFungibleTokenTransferSpec;
          if (nftTransfer.isApproved) {
            transaction.addApprovedNftTransfer(
              nftTransfer.nftId,
              nftTransfer.senderAccountId,
              nftTransfer.receiverAccountId
            );
          } else {
            transaction.addNftTransfer(
              nftTransfer.nftId,
              nftTransfer.senderAccountId,
              nftTransfer.receiverAccountId
            );
          }
        }
      }
    }

    if (params.hbarTransfers && params.hbarTransfers.length > 0) {
      for (const hbarTransfer of params.hbarTransfers) {
        transaction.addHbarTransfer(
          hbarTransfer.accountId,
          hbarTransfer.amount
        );
      }
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {WipeTokenAccountParams} params
   * @returns {this}
   * @throws {Error}
   */
  public wipeTokenAccount(params: WipeTokenAccountParams): this {
    const transaction = new TokenWipeTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    if (params.amount) {
      transaction.setAmount(this.parseAmount(params.amount));
    }
    if (params.serials && params.serials.length > 0) {
      transaction.setSerials(params.serials.map((s) => this.parseAmount(s)));
    }
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {FreezeTokenAccountParams} params
   * @returns {this}
   */
  public freezeTokenAccount(params: FreezeTokenAccountParams): this {
    const transaction = new TokenFreezeTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {UnfreezeTokenAccountParams} params
   * @returns {this}
   */
  public unfreezeTokenAccount(params: UnfreezeTokenAccountParams): this {
    const transaction = new TokenUnfreezeTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {GrantKycTokenParams} params
   * @returns {this}
   */
  public grantKycToken(params: GrantKycTokenParams): this {
    const transaction = new TokenGrantKycTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {RevokeKycTokenParams} params
   * @returns {this}
   */
  public revokeKycToken(params: RevokeKycTokenParams): this {
    const transaction = new TokenRevokeKycTransaction()
      .setAccountId(params.accountId)
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {PauseTokenParams} params
   * @returns {this}
   */
  public pauseToken(params: PauseTokenParams): this {
    const transaction = new TokenPauseTransaction().setTokenId(
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId
    );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {UnpauseTokenParams} params
   * @returns {this}
   */
  public unpauseToken(params: UnpauseTokenParams): this {
    const transaction = new TokenUnpauseTransaction().setTokenId(
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId
    );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {UpdateTokenParams} params
   * @returns {this}
   * @throws {Error}
   */
  public updateToken(params: UpdateTokenParams): this {
    if (!params.tokenId) {
      throw new Error('Token ID is required to update a token.');
    }
    this.logger.info(
      `[HtsBuilder.updateToken] Starting update for token ID: ${params.tokenId.toString()}`
    );
    const transaction = new TokenUpdateTransaction().setTokenId(
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId
    );

    if (Object.prototype.hasOwnProperty.call(params, 'tokenName')) {
      transaction.setTokenName(
        params.tokenName === null ? '' : params.tokenName!
      );
    }
    if (Object.prototype.hasOwnProperty.call(params, 'tokenSymbol')) {
      transaction.setTokenSymbol(
        params.tokenSymbol === null ? '' : params.tokenSymbol!
      );
    }
    if (params.treasuryAccountId) {
      transaction.setTreasuryAccountId(params.treasuryAccountId);
    }

    if (Object.prototype.hasOwnProperty.call(params, 'adminKey')) {
      if (params.adminKey === null) transaction.setAdminKey(new KeyList());
      else if (params.adminKey) {
        const pk = this.parseKey(params.adminKey);
        if (pk) transaction.setAdminKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'kycKey')) {
      if (params.kycKey === null) transaction.setKycKey(new KeyList());
      else if (params.kycKey) {
        const pk = this.parseKey(params.kycKey);
        if (pk) transaction.setKycKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'freezeKey')) {
      if (params.freezeKey === null) transaction.setFreezeKey(new KeyList());
      else if (params.freezeKey) {
        const pk = this.parseKey(params.freezeKey);
        if (pk) transaction.setFreezeKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'wipeKey')) {
      if (params.wipeKey === null) transaction.setWipeKey(new KeyList());
      else if (params.wipeKey) {
        const pk = this.parseKey(params.wipeKey);
        if (pk) transaction.setWipeKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'supplyKey')) {
      if (params.supplyKey === null) transaction.setSupplyKey(new KeyList());
      else if (params.supplyKey) {
        const pk = this.parseKey(params.supplyKey);
        if (pk) transaction.setSupplyKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'feeScheduleKey')) {
      if (params.feeScheduleKey === null)
        transaction.setFeeScheduleKey(new KeyList());
      else if (params.feeScheduleKey) {
        const pk = this.parseKey(params.feeScheduleKey);
        if (pk) transaction.setFeeScheduleKey(pk);
      }
    }
    if (Object.prototype.hasOwnProperty.call(params, 'pauseKey')) {
      if (params.pauseKey === null) transaction.setPauseKey(new KeyList());
      else if (params.pauseKey) {
        const pk = this.parseKey(params.pauseKey);
        if (pk) transaction.setPauseKey(pk);
      }
    }

    if (Object.prototype.hasOwnProperty.call(params, 'memo')) {
      transaction.setTokenMemo(params.memo === null ? '' : params.memo!);
    }

    if (Object.prototype.hasOwnProperty.call(params, 'autoRenewAccountId')) {
      const autoRenewId = params.autoRenewAccountId;
      if (autoRenewId === null) {
        transaction.setAutoRenewAccountId(AccountId.fromString('0.0.0'));
      } else if (autoRenewId) {
        transaction.setAutoRenewAccountId(autoRenewId);
      }
    }
    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    }

    this.logger.info(
      '[HtsBuilder.updateToken] Transaction object populated. Setting current transaction.',
      transaction
    );
    this.setCurrentTransaction(transaction);
    this.logger.info(
      '[HtsBuilder.updateToken] Current transaction set. Value:',
      this.currentTransaction
    );
    return this;
  }

  /**
   * @param {DeleteTokenParams} params
   * @returns {this}
   */
  public deleteToken(params: DeleteTokenParams): this {
    if (!params.tokenId) {
      throw new Error('Token ID is required to delete a token.');
    }
    const transaction = new TokenDeleteTransaction().setTokenId(
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId
    );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {TokenFeeScheduleUpdateParams} params
   * @returns {this}
   */
  public feeScheduleUpdate(params: TokenFeeScheduleUpdateParams): this {
    if (!params.tokenId) {
      throw new Error('Token ID is required to update fee schedule.');
    }
    const transaction = new TokenFeeScheduleUpdateTransaction()
      .setTokenId(
        typeof params.tokenId === 'string'
          ? TokenId.fromString(params.tokenId)
          : params.tokenId
      )
      .setCustomFees(params.customFees);
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures a transaction to airdrop fungible tokens from the operator's account to multiple recipients.
   * This method uses the `TokenAirdropTransaction`.
   * @param {AirdropTokenParams} params - Parameters for the airdrop.
   * @returns {this} The HtsBuilder instance for fluent chaining.
   * @throws {Error} If no recipients are provided or if amounts are invalid.
   */
  public airdropToken(params: AirdropTokenParams): this {
    if (!params.recipients || params.recipients.length === 0) {
      throw new Error('Recipients are required for an airdrop.');
    }

    const transaction = new TokenAirdropTransaction();
    const operatorAccountId = this.signer.getAccountId();
    const tokenId =
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId;
    let validTransfersMade = false;

    for (const recipient of params.recipients) {
      const transferAmount = this.parseAmount(recipient.amount);

      if (transferAmount.isZero() || transferAmount.isNegative()) {
        this.logger.warn(
          `Skipping airdrop to ${recipient.accountId.toString()} with zero or negative amount.`
        );
        continue;
      }

      transaction.addTokenTransfer(
        tokenId,
        operatorAccountId,
        transferAmount.negate()
      );
      transaction.addTokenTransfer(
        tokenId,
        recipient.accountId,
        transferAmount
      );
      validTransfersMade = true;
    }

    if (!validTransfersMade) {
      throw new Error(
        'No valid transfers generated for the airdrop. Check recipient amounts.'
      );
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures a transaction to claim pending airdrops.
   * The operator (signer) is the recipient of the claim.
   * @param {ClaimAirdropParams} params - Parameters specifying which pending airdrops to claim.
   *                                      The `pendingAirdropIds` should be valid `PendingAirdropId` instances from the SDK.
   * @returns {this} The HtsBuilder instance for fluent chaining.
   * @throws {Error} If no `pendingAirdropIds` are provided.
   */
  public claimAirdrop(params: ClaimAirdropParams): this {
    if (!params.pendingAirdropIds || params.pendingAirdropIds.length === 0) {
      throw new Error(
        'pendingAirdropIds must be provided and non-empty for claimAirdrop.'
      );
    }

    const transaction = new TokenClaimAirdropTransaction();

    for (const pendingId of params.pendingAirdropIds) {
      transaction.addPendingAirdropId(pendingId);
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures a transaction to cancel pending airdrops sent by the operator.
   * @param {CancelAirdropParams} params - Parameters specifying which pending airdrops to cancel.
   *                                       The `pendingAirdropIds` should be valid `PendingAirdropId` instances from the SDK.
   * @returns {this} The HtsBuilder instance for fluent chaining.
   * @throws {Error} If no `pendingAirdropIds` are provided.
   */
  public cancelAirdrop(params: CancelAirdropParams): this {
    if (!params.pendingAirdropIds || params.pendingAirdropIds.length === 0) {
      throw new Error(
        'pendingAirdropIds must be provided and non-empty for cancelAirdrop.'
      );
    }
    const transaction = new TokenCancelAirdropTransaction();

    transaction.setPendingAirdropIds(params.pendingAirdropIds);

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures a transaction for the operator to reject future auto-associations with specified token types.
   * @param {RejectAirdropParams} params - Parameters specifying which tokens to reject.
   *        Note: `senderAccountId` and `serials` from `RejectAirdropParams` are currently ignored by this method
   *        as `TokenRejectTransaction` operates on token types for the owner.
   * @returns {this} The HtsBuilder instance for fluent chaining.
   */
  public rejectTokens(params: RejectAirdropParams): this {
    const transaction = new TokenRejectTransaction().setOwnerId(
      this.signer.getAccountId()
    );

    const tokenToReject =
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId;
    transaction.addTokenId(tokenToReject);

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }
}
