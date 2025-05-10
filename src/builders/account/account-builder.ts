import {
  AccountId,
  AccountCreateTransaction,
  AccountUpdateTransaction,
  AccountDeleteTransaction,
  Client,
  Hbar,
  PrivateKey,
  PublicKey,
  Transaction,
  TransactionReceipt,
  TransferTransaction,
  Long,
  EvmAddress,
  Timestamp,
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  HbarUnit,
  TokenId,
  NftId,
  Key,
} from '@hashgraph/sdk';
import BigNumber from 'bignumber.js';
import { AbstractSigner } from '../../signer/abstract-signer';
import {
  CreateAccountParams,
  HbarTransferParams,
  UpdateAccountParams,
  DeleteAccountParams,
  ApproveHbarAllowanceParams,
  ApproveTokenNftAllowanceParams,
  ApproveFungibleTokenAllowanceParams,
  DeleteNftAllowanceAllSerialsParams,
  RevokeHbarAllowanceParams,
  RevokeFungibleTokenAllowanceParams,
  DeleteNftSpenderAllowanceParams,
} from '../../types';
import { BaseServiceBuilder } from '../base-service-builder';

const DEFAULT_ACCOUNT_AUTORENEW_PERIOD_SECONDS = 7776000;

/**
 * AccountBuilder facilitates the construction and execution of Hedera account-related transactions.
 */
export class AccountBuilder extends BaseServiceBuilder {
  /**
   * @param {AbstractSigner} signer
   * @param {Client} basicClient
   */
  constructor(signer: AbstractSigner, basicClient: Client) {
    super(signer, basicClient);
  }

  /**
   * @param {CreateAccountParams} params
   * @returns {this}
   * @throws {Error}
   */
  public createAccount(params: CreateAccountParams): this {
    const transaction = new AccountCreateTransaction();

    if (params.key) {
      if (typeof params.key === 'string') {
        transaction.setKey(PrivateKey.fromString(params.key));
      } else {
        transaction.setKey(params.key as Key);
      }
    }

    if (params.initialBalance) {
      if (typeof params.initialBalance === 'string') {
        transaction.setInitialBalance(Hbar.fromString(params.initialBalance));
      } else if (typeof params.initialBalance === 'number') {
        transaction.setInitialBalance(new Hbar(params.initialBalance));
      } else {
        transaction.setInitialBalance(params.initialBalance);
      }
    }

    if (params.receiverSignatureRequired) {
      transaction.setReceiverSignatureRequired(
        params.receiverSignatureRequired
      );
    }

    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    } else {
      transaction.setAutoRenewPeriod(DEFAULT_ACCOUNT_AUTORENEW_PERIOD_SECONDS);
    }

    if (params.memo) {
      transaction.setAccountMemo(params.memo);
    }

    if (params.maxAutomaticTokenAssociations) {
      transaction.setMaxAutomaticTokenAssociations(
        params.maxAutomaticTokenAssociations
      );
    }

    if (params.stakedAccountId) {
      transaction.setStakedAccountId(params.stakedAccountId);
    }

    if (params.stakedNodeId) {
      transaction.setStakedNodeId(params.stakedNodeId);
    }

    if (params.declineStakingReward) {
      transaction.setDeclineStakingReward(params.declineStakingReward);
    }

    if (params.alias) {
      transaction.setAlias(params.alias);
    }

    if (!params.key && !params.alias) {
      console.warn(
        'AccountCreateTransaction: Neither key nor a usable alias (PublicKey/EvmAddress) was provided. Transaction might fail.'
      );
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {HbarTransferParams} params
   * @returns {this}
   * @throws {Error}
   */
  public transferHbar(params: HbarTransferParams): this {
    const transaction = new TransferTransaction();
    if (!params.transfers || params.transfers.length === 0) {
      throw new Error('HbarTransferParams must include at least one transfer.');
    }
    let netZeroInTinybars = new BigNumber(0);
    for (const transfer of params.transfers) {
      transaction.addHbarTransfer(transfer.accountId, transfer.amount);
      const tinybarsContribution = transfer.amount.toTinybars();
      netZeroInTinybars = netZeroInTinybars.plus(
        tinybarsContribution.toString()
      );
    }

    if (!netZeroInTinybars.isZero()) {
      throw new Error('The sum of all HBAR transfers must be zero.');
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {UpdateAccountParams} params
   * @returns {this}
   * @throws {Error}
   */
  public updateAccount(params: UpdateAccountParams): this {
    if (!params.accountIdToUpdate) {
      throw new Error('accountIdToUpdate is required for updating an account.');
    }
    const transaction = new AccountUpdateTransaction().setAccountId(
      params.accountIdToUpdate
    );

    if (params.key) {
      if (typeof params.key === 'string') {
        transaction.setKey(PrivateKey.fromString(params.key).publicKey);
      } else {
        transaction.setKey(params.key as Key);
      }
    }

    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    }

    if (params.receiverSignatureRequired) {
      transaction.setReceiverSignatureRequired(
        params.receiverSignatureRequired
      );
    }

    if (params.stakedAccountId) {
      transaction.setStakedAccountId(params.stakedAccountId);
    }

    if (params.stakedNodeId) {
      transaction.setStakedNodeId(params.stakedNodeId);
    }

    if (params.declineStakingReward) {
      transaction.setDeclineStakingReward(params.declineStakingReward);
    }

    if (params.memo) {
      transaction.setAccountMemo(params.memo);
    }

    if (params.maxAutomaticTokenAssociations) {
      transaction.setMaxAutomaticTokenAssociations(
        params.maxAutomaticTokenAssociations
      );
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {DeleteAccountParams} params
   * @returns {this}
   * @throws {Error}
   */
  public deleteAccount(params: DeleteAccountParams): this {
    if (!params.deleteAccountId) {
      throw new Error('deleteAccountId is required for deleting an account.');
    }
    if (!params.transferAccountId) {
      throw new Error('transferAccountId is required for deleting an account.');
    }

    const transaction = new AccountDeleteTransaction()
      .setAccountId(params.deleteAccountId)
      .setTransferAccountId(params.transferAccountId);

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {ApproveHbarAllowanceParams} params
   * @returns {this}
   */
  public approveHbarAllowance(params: ApproveHbarAllowanceParams): this {
    const transaction =
      new AccountAllowanceApproveTransaction().approveHbarAllowance(
        params.ownerAccountId || this.signer.getAccountId(),
        params.spenderAccountId,
        params.amount
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {ApproveTokenNftAllowanceParams} params
   * @returns {this}
   * @throws {Error}
   */
  public approveTokenNftAllowance(
    params: ApproveTokenNftAllowanceParams
  ): this {
    const transaction = new AccountAllowanceApproveTransaction();
    const owner = params.ownerAccountId || this.signer.getAccountId();
    const tokenId =
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId;

    if (params.allSerials) {
      transaction.approveTokenNftAllowanceAllSerials(
        tokenId,
        owner,
        params.spenderAccountId
      );
    } else if (params.serials && params.serials.length > 0) {
      for (const serial of params.serials) {
        let serialLong: Long;
        if (typeof serial === 'number') {
          serialLong = Long.fromNumber(serial);
        } else if (serial instanceof BigNumber) {
          serialLong = Long.fromString(serial.toString());
        } else {
          serialLong = serial;
        }
        transaction.approveTokenNftAllowance(
          new NftId(tokenId, serialLong),
          owner,
          params.spenderAccountId
        );
      }
    } else {
      throw new Error(
        "Either allSerials must be true or 'serials' (with serial numbers) must be provided for NFT allowance."
      );
    }

    if (params.memo) {
      transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {ApproveFungibleTokenAllowanceParams} params
   * @returns {this}
   */
  public approveFungibleTokenAllowance(
    params: ApproveFungibleTokenAllowanceParams
  ): this {
    const tokenId =
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId;
    let amountLong: Long;

    if (typeof params.amount === 'string') {
      amountLong = Long.fromString(params.amount);
    } else if (typeof params.amount === 'number') {
      amountLong = Long.fromNumber(params.amount);
    } else if (params.amount instanceof BigNumber) {
      amountLong = Long.fromString(params.amount.toString());
    } else {
      amountLong = params.amount;
    }

    const transaction =
      new AccountAllowanceApproveTransaction().approveTokenAllowance(
        tokenId,
        params.ownerAccountId || this.signer.getAccountId(),
        params.spenderAccountId,
        amountLong
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Deletes all NFT allowances for a specific token collection between an owner and a spender.
   * @param {DeleteNftSpenderAllowanceParams} params
   * @returns {this}
   */
  public deleteNftSpenderAllowance(
    params: DeleteNftSpenderAllowanceParams
  ): this {
    this.logger.warn('deleteNftSpenderAllowance is currently non-functional pending SDK signature clarification/refactor.');
    // const tokenIdentity =
    //   typeof params.tokenId === 'string'
    //     ? TokenId.fromString(params.tokenId)
    //     : params.tokenId;
    // const owner = params.ownerAccountId || this.signer.getAccountId();
    // const spender = 
    //   typeof params.spenderAccountId === 'string'
    //     ? AccountId.fromString(params.spenderAccountId)
    //     : params.spenderAccountId;

    // const transaction =
    //   new AccountAllowanceDeleteTransaction().deleteAllTokenNftAllowances(
    //     tokenIdentity, 
    //     owner,
    //     // spender // TODO: SDK signature for 3 args was problematic. Verify.
    //   );
    
    // if (params.memo) {
    //     transaction.setTransactionMemo(params.memo);
    // }

    // this.setCurrentTransaction(transaction);
    throw new Error('deleteNftSpenderAllowance is temporarily disabled.')
    return this;
  }

  /**
   * @param {RevokeHbarAllowanceParams} params
   * @returns {this}
   */
  public revokeHbarAllowance(params: RevokeHbarAllowanceParams): this {
    const transaction =
      new AccountAllowanceApproveTransaction().approveHbarAllowance(
        params.ownerAccountId || this.signer.getAccountId(),
        params.spenderAccountId,
        new Hbar(0)
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {RevokeFungibleTokenAllowanceParams} params
   * @returns {this}
   */
  public revokeFungibleTokenAllowance(
    params: RevokeFungibleTokenAllowanceParams
  ): this {
    const tokenId =
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId;
    const transaction =
      new AccountAllowanceApproveTransaction().approveTokenAllowance(
        tokenId,
        params.ownerAccountId || this.signer.getAccountId(),
        params.spenderAccountId,
        0
      );
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Deletes all NFT allowances for all serials of a given token type granted by an owner.
   * This effectively removes allowances for all spenders for that token from the specified owner.
   * @param {DeleteNftAllowanceAllSerialsParams} params
   * @returns {this}
   */
  public deleteNftAllowanceAllSerials(
    params: DeleteNftAllowanceAllSerialsParams
  ): this {
    const tokenIdentity =
      typeof params.tokenId === 'string'
        ? TokenId.fromString(params.tokenId)
        : params.tokenId;
    const nftIdForOperation = new NftId(tokenIdentity, Long.ZERO); 
    const owner = params.ownerAccountId || this.signer.getAccountId();

    const transaction =
      new AccountAllowanceDeleteTransaction().deleteAllTokenNftAllowances(
        nftIdForOperation, 
        owner              
      );
    
    if (params.memo) {
        transaction.setTransactionMemo(params.memo);
    }

    this.setCurrentTransaction(transaction);
    return this;
  }
}
