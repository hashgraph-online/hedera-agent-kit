import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicDeleteTransaction,
  TopicUpdateTransaction,
  TopicId,
  PublicKey,
  AccountId,
  KeyList,
} from '@hashgraph/sdk';
import { Buffer } from 'buffer';
import {
  CreateTopicParams,
  SubmitMessageParams,
  DeleteTopicParams,
  UpdateTopicParams,
} from '../../types';
import { BaseServiceBuilder } from '../base-service-builder';
import { HederaAgentKit } from '../../agent/agent';

const DEFAULT_AUTORENEW_PERIOD_SECONDS = 7776000;
const MAX_SINGLE_MESSAGE_BYTES = 1000;

/**
 * HcsBuilder facilitates the construction and execution of Hedera Consensus Service (HCS) transactions.
 * It extends BaseServiceBuilder to provide common transaction execution and byte generation methods.
 */
export class HcsBuilder extends BaseServiceBuilder {
  constructor(hederaKit: HederaAgentKit) {
    super(hederaKit);
  }

  /**
   * @param {CreateTopicParams} params
   * @returns {Promise<this>}
   */
  public async createTopic(params: CreateTopicParams): Promise<this> {
    this.clearNotes();
    const transaction = new TopicCreateTransaction();

    if (params.memo) {
      transaction.setTopicMemo(params.memo);
    }

    if (params.adminKey) {
      const parsedAdminKey = await this.parseKey(params.adminKey);
      if (parsedAdminKey) {
        transaction.setAdminKey(parsedAdminKey);
      }
    }

    if (params.feeScheduleKey) {
      const parsedFeeScheduleKey = await this.parseKey(params.feeScheduleKey);
      if (parsedFeeScheduleKey) {
        transaction.setFeeScheduleKey(parsedFeeScheduleKey);
      }
    }

    if (params.submitKey) {
      const parsedSubmitKey = await this.parseKey(params.submitKey);
      if (parsedSubmitKey) {
        transaction.setSubmitKey(parsedSubmitKey);
      }
    }

    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    } else {
      transaction.setAutoRenewPeriod(DEFAULT_AUTORENEW_PERIOD_SECONDS);
      this.addNote(`Default auto-renew period of ${DEFAULT_AUTORENEW_PERIOD_SECONDS} seconds applied for topic.`);
    }

    if (params.autoRenewAccountId) {
      transaction.setAutoRenewAccountId(params.autoRenewAccountId);
    } else {
      this.logger.warn(
        'MirrorNode client is not available on the signer, cannot set fee exempt keys by account ID for createTopic.'
      );
      this.addNote('Could not set fee exempt accounts for topic creation: MirrorNode client not available on signer.');
    }

    if (params.customFees && params.customFees.length > 0) {
      transaction.setCustomFees(params.customFees);
    }

    if (params.exemptAccountIds && params.exemptAccountIds.length > 0) {
      if (!this.kit.signer.mirrorNode) {
        this.logger.warn(
          'MirrorNode client is not available on the signer, cannot set fee exempt keys by account ID for createTopic.'
        );
        this.addNote('Could not attempt to set fee exempt accounts for topic creation: MirrorNode client not available on signer.');
      } else {
        try {
          const publicKeys: PublicKey[] = [];
          for (const accountIdStr of params.exemptAccountIds) {
            const publicKey = await this.kit.signer.mirrorNode.getPublicKey(
              accountIdStr
            );
            publicKeys.push(publicKey);
          }
          if (publicKeys.length > 0) {
            this.logger.warn(
              'TopicCreateTransaction does not support setFeeExemptKeys. This parameter will be ignored for topic creation.'
            );
          }
        } catch (e: unknown) {
          const error = e as Error;
          this.logger.error(
            `Failed to process exemptAccountIds for createTopic: ${error.message}`
          );
          this.addNote(`Error processing fee exempt accounts for topic creation: ${error.message}. They may not be set.`);
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
      this.logger.warn(
        `HcsBuilder: Message size (${messageBytesLength} bytes) exceeds recommended single transaction limit (${MAX_SINGLE_MESSAGE_BYTES} bytes). The transaction will likely fail if not accepted by the network.`
      );
    }

    let transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(messageContents);

    if (params.maxChunks) {
      transaction.setMaxChunks(params.maxChunks);
    }

    if (params.chunkSize) {
      transaction.setChunkSize(params.chunkSize);
    }

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
    this.clearNotes();
    if (!params.topicId) {
      throw new Error('Topic ID is required to update a topic.');
    }
    const transaction = new TopicUpdateTransaction().setTopicId(params.topicId);

    if (Object.prototype.hasOwnProperty.call(params, 'memo')) {
      transaction.setTopicMemo(params.memo === null ? '' : params.memo!);
    }

    if (Object.prototype.hasOwnProperty.call(params, 'adminKey')) {
      if (params.adminKey === null) {
        transaction.setAdminKey(new KeyList());
      } else if (params.adminKey) {
        const parsedAdminKey = await this.parseKey(params.adminKey);
        if (parsedAdminKey) transaction.setAdminKey(parsedAdminKey);
      }
    }

    if (Object.prototype.hasOwnProperty.call(params, 'submitKey')) {
      if (params.submitKey === null) {
        transaction.setSubmitKey(new KeyList());
      } else if (params.submitKey) {
        const parsedSubmitKey = await this.parseKey(params.submitKey);
        if (parsedSubmitKey) transaction.setSubmitKey(parsedSubmitKey);
      }
    }

    if (params.autoRenewPeriod) {
      transaction.setAutoRenewPeriod(params.autoRenewPeriod);
    }

    if (Object.prototype.hasOwnProperty.call(params, 'autoRenewAccountId')) {
      if (params.autoRenewAccountId === null) {
        transaction.setAutoRenewAccountId(AccountId.fromString('0.0.0'));
      } else if (params.autoRenewAccountId) {
        transaction.setAutoRenewAccountId(
          params.autoRenewAccountId as string | AccountId
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(params, 'exemptAccountIds')) {
      if (
        params.exemptAccountIds &&
        params.exemptAccountIds.length > 0 &&
        !this.kit.signer.mirrorNode 
      ) {
        this.logger.warn(
          'MirrorNode client is not available on the signer, cannot set fee exempt keys by account ID for updateTopic if account IDs are provided and not empty.'
        );
        this.addNote('Could not set fee exempt accounts for topic update: MirrorNode client not available on signer.');
      } else if (params.exemptAccountIds) {
        if (params.exemptAccountIds.length === 0) {
          transaction.setFeeExemptKeys([]);
        } else {
          try {
            const publicKeys: PublicKey[] = [];
            for (const accountIdStr of params.exemptAccountIds) {
              const publicKey = await this.kit.signer.mirrorNode.getPublicKey(
                accountIdStr
              );
              publicKeys.push(publicKey);
            }
            if (publicKeys.length > 0) {
              transaction.setFeeExemptKeys(publicKeys);
            } else {
              this.addNote('Fee exempt accounts were provided, but no valid public keys could be resolved for them.');
            }
          } catch (e: unknown) {
            const error = e as Error;
            this.logger.error(
              `Failed to process exemptAccountIds for updateTopic: ${error.message}`
            );
            this.addNote(`Error processing fee exempt accounts for topic update: ${error.message}. They may not be set.`);
          }
        }
      }
    }

    this.setCurrentTransaction(transaction);
    return this;
  }
}
