import {
  AccountId,
  Client,
  Transaction,
  TransactionId,
  TransactionReceipt,
  ScheduleCreateTransaction,
  ScheduleId,
  Key
} from '@hashgraph/sdk';
import { Buffer } from 'buffer';
import { AbstractSigner } from '../signer/abstract-signer';
import { Logger } from '@hashgraphonline/standards-sdk';

/**
 * Defines the structure for the result of an execute operation.
 */
export interface ExecuteResult {
  success: boolean;
  receipt?: TransactionReceipt;
  scheduleId?: ScheduleId | string;
  error?: string;
  transactionId?: string | undefined;
}

/**
 * BaseServiceBuilder provides common functionality for service-specific builders.
 * It manages the current transaction being built and offers common execution and byte generation methods.
 */
export abstract class BaseServiceBuilder {
  protected currentTransaction: Transaction | null = null;
  protected logger: Logger;

  /**
   * @param {AbstractSigner} signer
   * @param {Client} basicClient
   */
  constructor(
    protected readonly signer: AbstractSigner,
    protected readonly basicClient: Client,
  ) {
    this.logger = new Logger({
      module: 'ServiceBuilder',
      level: 'info',
    });
  }

  /**
   * @param {string} memo
   * @returns {this}
   * @throws {Error}
   */
  public setTransactionMemo(memo: string): this {
    if (!this.currentTransaction) {
      throw new Error(
        'No transaction is currently being built. Call a specific transaction method first (e.g., createTopic).'
      );
    }
    this.currentTransaction.setTransactionMemo(memo);
    return this;
  }

  /**
   * @param {TransactionId} transactionId
   * @returns {this}
   * @throws {Error}
   */
  public setTransactionId(transactionId: TransactionId): this {
    if (!this.currentTransaction) {
      throw new Error(
        'No transaction is currently being built. Call a specific transaction method first.'
      );
    }
    this.currentTransaction.setTransactionId(transactionId);
    return this;
  }

  /**
   * @param {AccountId[]} nodeAccountIds
   * @returns {this}
   * @throws {Error}
   */
  public setNodeAccountIds(nodeAccountIds: AccountId[]): this {
    if (!this.currentTransaction) {
      throw new Error(
        'No transaction is currently being built. Call a specific transaction method first.'
      );
    }
    this.currentTransaction.setNodeAccountIds(nodeAccountIds);
    return this;
  }

  /**
   * @param {object} [options]
   * @param {boolean} [options.schedule]
   * @param {string} [options.scheduleMemo]
   * @param {string | AccountId} [options.schedulePayerAccountId]
   * @param {Key} [options.scheduleAdminKey]
   * @returns {Promise<ExecuteResult>}
   * @throws {Error}
   */
  public async execute(options?: {
    schedule?: boolean;
    scheduleMemo?: string;
    schedulePayerAccountId?: string | AccountId;
    scheduleAdminKey?: Key;
  }): Promise<ExecuteResult> {
    const innerTransaction = this.currentTransaction;

    if (!innerTransaction) {
      return {
        success: false,
        error: 'No transaction to execute. Call a specific transaction method first.',
      };
    }

    let transactionToExecute: Transaction = innerTransaction;
    let originalTransactionIdForReporting = innerTransaction.transactionId?.toString();

    if (options?.schedule) {
      this.logger.info('Scheduling transaction...');
      const scheduleCreateTx = new ScheduleCreateTransaction()
        .setScheduledTransaction(innerTransaction);

      if (options.scheduleMemo) {
        scheduleCreateTx.setScheduleMemo(options.scheduleMemo);
      }
      if (options.schedulePayerAccountId) {
        const payerAccountId =
          typeof options.schedulePayerAccountId === 'string'
            ? AccountId.fromString(options.schedulePayerAccountId)
            : options.schedulePayerAccountId;
        scheduleCreateTx.setPayerAccountId(payerAccountId);
      }
      if (options.scheduleAdminKey) {
        scheduleCreateTx.setAdminKey(options.scheduleAdminKey);
      }

      transactionToExecute = scheduleCreateTx;
      if (!transactionToExecute.transactionId) {
        await transactionToExecute.freezeWith(this.basicClient);
      }
      originalTransactionIdForReporting = transactionToExecute.transactionId?.toString();
    }

    try {
      const receipt = await this.signer.signAndExecuteTransaction(transactionToExecute);

      const result: ExecuteResult = {
        success: true,
        receipt: receipt,
        transactionId: originalTransactionIdForReporting,
      };

      if (options?.schedule && receipt.scheduleId) {
        result.scheduleId = receipt.scheduleId.toString();
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Transaction execution failed: ${error.message}`);
      const errorResult: ExecuteResult = {
        success: false,
        error: error.message || 'An unknown error occurred during transaction execution.',
        transactionId: originalTransactionIdForReporting,
      };
      return errorResult;
    }
  }

  /**
   * @param {object} [options]
   * @param {boolean} [options.schedule]
   * @param {string} [options.scheduleMemo]
   * @param {string | AccountId} [options.schedulePayerAccountId]
   * @param {Key} [options.scheduleAdminKey]
   * @returns {Promise<string>}
   * @throws {Error}
   */
  public async getTransactionBytes(options?: {
    schedule?: boolean;
    scheduleMemo?: string;
    schedulePayerAccountId?: string | AccountId;
    scheduleAdminKey?: Key;
  }): Promise<string> {
    if (!this.currentTransaction) {
      throw new Error('No transaction to get bytes for. Call a specific transaction method first.');
    }

    let transactionForBytes: Transaction = this.currentTransaction;

    if (options?.schedule) {
      this.logger.info('Preparing bytes for scheduled transaction...');
      const scheduleCreateTx = new ScheduleCreateTransaction()
        .setScheduledTransaction(this.currentTransaction);

      if (options.scheduleMemo) {
        scheduleCreateTx.setScheduleMemo(options.scheduleMemo);
      }
      if (options.schedulePayerAccountId) {
        const payerAccountId =
          typeof options.schedulePayerAccountId === 'string'
            ? AccountId.fromString(options.schedulePayerAccountId)
            : options.schedulePayerAccountId;
        scheduleCreateTx.setPayerAccountId(payerAccountId);
      }
      if (options.scheduleAdminKey) {
        scheduleCreateTx.setAdminKey(options.scheduleAdminKey);
      }
      transactionForBytes = scheduleCreateTx;
    }

    if (!transactionForBytes.isFrozen()) {
      transactionForBytes = transactionForBytes.freezeWith(this.basicClient);
    }
    return Buffer.from(transactionForBytes.toBytes()).toString('base64');
  }

  /**
   * @param {Transaction} transaction
   */
  protected setCurrentTransaction(transaction: Transaction): void {
    this.currentTransaction = transaction;
  }
}
