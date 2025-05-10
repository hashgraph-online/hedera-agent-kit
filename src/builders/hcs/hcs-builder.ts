import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicDeleteTransaction,
  TopicUpdateTransaction,
  TopicId,
  PrivateKey,
  PublicKey,
  TransactionReceipt,
  Transaction,
  CustomFee,
  Timestamp,
  AccountId,
  Key,
} from '@hashgraph/sdk';
import { Buffer } from 'buffer';
import { AbstractSigner } from '../../signer/abstract-signer';
import {
  CreateTopicParams,
  SubmitMessageParams,
  DeleteTopicParams,
  UpdateTopicParams,
} from '../../types';
import { BaseServiceBuilder } from '../base-service-builder';

const DEFAULT_AUTORENEW_PERIOD_SECONDS = 7776000;
const MAX_SINGLE_MESSAGE_BYTES = 6000;

/**
 * HcsBuilder facilitates the construction and execution of Hedera Consensus Service (HCS) transactions.
 * It extends BaseServiceBuilder to provide common transaction execution and byte generation methods.
 */
export class HcsBuilder extends BaseServiceBuilder {
  /**
   * @param {AbstractSigner} signer
   * @param {Client} basicClient
   */
  constructor(signer: AbstractSigner, basicClient: Client) {
    super(signer, basicClient);
  }

  /**
   * @param {CreateTopicParams} params
   * @returns {Promise<this>}
   */
  public async createTopic(params: CreateTopicParams): Promise<this> {
    const transaction = new TopicCreateTransaction();

    if (params.memo) {
      transaction.setTopicMemo(params.memo);
    }

    if (params.adminKey) {
      if (typeof params.adminKey === 'string') {
        transaction.setAdminKey(
          PrivateKey.fromString(params.adminKey).publicKey
        );
      } else {
        transaction.setAdminKey(params.adminKey as Key);
      }
    }

    if (params.submitKey) {
      if (typeof params.submitKey === 'string') {
        transaction.setSubmitKey(
          PrivateKey.fromString(params.submitKey).publicKey
        );
      } else {
        transaction.setSubmitKey(params.submitKey as Key);
      }
    }

    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    } else {
      transaction.setAutoRenewPeriod(DEFAULT_AUTORENEW_PERIOD_SECONDS);
    }

    if (params.autoRenewAccountId) {
      transaction.setAutoRenewAccountId(params.autoRenewAccountId);
    }

    if (params.feeScheduleKey) {
      if (typeof params.feeScheduleKey === 'string') {
        transaction.setFeeScheduleKey(
          PrivateKey.fromString(params.feeScheduleKey).publicKey
        );
      } else {
        transaction.setFeeScheduleKey(params.feeScheduleKey as Key);
      }
    }
    if (params.customFees && params.customFees.length > 0) {
      transaction.setCustomFees(params.customFees);
    }

    if (params.exemptAccountIds && params.exemptAccountIds.length > 0) {
      if (!this.signer.mirrorNode) {
        this.logger.warn(
          'MirrorNode client is not available on the signer, cannot set fee exempt keys by account ID.'
        );
      } else {
        try {
          const publicKeys: PublicKey[] = [];
          for (const accountIdStr of params.exemptAccountIds) {
            const publicKey = await this.signer.mirrorNode.getPublicKey(
              accountIdStr
            );
            publicKeys.push(publicKey);
          }
          if (publicKeys.length > 0) {
            transaction.setFeeExemptKeys(publicKeys);
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to process exemptAccountIds for createTopic: ${error.message}`
          );
        }
      }
    }

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures the builder to submit a message to an HCS topic.
   * The transaction will be signed by the primary signer (operator).
   * If the target topic has a specific submit key and it is different from the operator's key,
   * the transaction may fail at the network level unless the transaction bytes are retrieved
   * using `getTransactionBytes()` and signed externally by the required submit key(s) before submission.
   * The `params.submitKey` (if provided in `SubmitMessageParams`) is not directly used to sign
   * within this builder method for `TopicMessageSubmitTransaction` as the transaction type itself
   * does not have a field for an overriding submitter's public key; authorization is based on the topic's configuration.
   * @param {SubmitMessageParams} params - Parameters for submitting the message.
   * @returns {this} The HcsBuilder instance for fluent chaining.
   */
  public submitMessageToTopic(params: SubmitMessageParams): this {
    const topicId =
      typeof params.topicId === 'string'
        ? TopicId.fromString(params.topicId)
        : params.topicId;
    const messageContents = params.message;
    const messageBytesLength =
      typeof messageContents === 'string'
        ? Buffer.from(messageContents, 'utf8').length
        : messageContents.length;

    if (messageBytesLength > MAX_SINGLE_MESSAGE_BYTES) {
      console.warn(
        `HcsBuilder: Message size (${messageBytesLength} bytes) exceeds recommended single transaction limit (${MAX_SINGLE_MESSAGE_BYTES} bytes). The transaction will likely fail if not accepted by the network.`
      );
    }
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(messageContents);

    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * @param {DeleteTopicParams} params
   * @returns {this}
   * @throws {Error}
   */
  public deleteTopic(params: DeleteTopicParams): this {
    if (params.topicId === undefined) {
      throw new Error('Topic ID is required to delete a topic.');
    }
    const transaction = new TopicDeleteTransaction().setTopicId(params.topicId);
    this.setCurrentTransaction(transaction);
    return this;
  }

  /**
   * Configures the builder to update an HCS topic.
   * @param {UpdateTopicParams} params - Parameters for updating the topic.
   * @returns {Promise<this>} The HcsBuilder instance for fluent chaining.
   * @throws {Error} If topicId is not provided.
   */
  public async updateTopic(params: UpdateTopicParams): Promise<this> {
    if (!params.topicId) {
      throw new Error('Topic ID is required to update a topic.');
    }
    const transaction = new TopicUpdateTransaction().setTopicId(params.topicId);

    if (params.memo) {
      transaction.setTopicMemo(params.memo);
    }

    if (params.adminKey) {
      if (typeof params.adminKey === 'string') {
        transaction.setAdminKey(
          PrivateKey.fromString(params.adminKey).publicKey
        );
      } else {
        transaction.setAdminKey(params.adminKey as Key);
      }
    }

    if (params.submitKey) {
      if (typeof params.submitKey === 'string') {
        transaction.setSubmitKey(
          PrivateKey.fromString(params.submitKey).publicKey
        );
      } else {
        transaction.setSubmitKey(params.submitKey as Key);
      }
    }

    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    }

    if (params.autoRenewAccountId) {
      transaction.setAutoRenewAccountId(
        params.autoRenewAccountId as string | AccountId
      );
    }

    if (params.feeScheduleKey) {
      if (typeof params.feeScheduleKey === 'string') {
        transaction.setFeeScheduleKey(
          PrivateKey.fromString(params.feeScheduleKey).publicKey
        );
      } else {
        transaction.setFeeScheduleKey(params.feeScheduleKey as Key);
      }
    }

    if (params.exemptAccountIds) {
      if (!this.signer.mirrorNode) {
        this.logger.warn(
          'MirrorNode client is not available on the signer, cannot set fee exempt keys by account ID for updateTopic.'
        );
      } else {
        if (params.exemptAccountIds.length === 0) {
          transaction.setFeeExemptKeys([]);
        } else {
          try {
            const publicKeys: PublicKey[] = [];
            for (const accountIdStr of params.exemptAccountIds) {
              const publicKey = await this.signer.mirrorNode.getPublicKey(
                accountIdStr
              );
              publicKeys.push(publicKey);
            }
            if (publicKeys.length > 0) {
              transaction.setFeeExemptKeys(publicKeys);
            }
          } catch (error: any) {
            this.logger.error(
              `Failed to process exemptAccountIds for updateTopic: ${error.message}`
            );
          }
        }
      }
    }

    this.setCurrentTransaction(transaction);
    return this;
  }
}
