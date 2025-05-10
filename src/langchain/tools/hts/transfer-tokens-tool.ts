import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import {
  TransferTokensParams,
  TokenTransferSpec,
  FungibleTokenTransferSpec,
  NonFungibleTokenTransferSpec,
} from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { AccountId, TokenId, NftId } from '@hashgraph/sdk';
import { BigNumber } from 'bignumber.js';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const TransferTokensZodSchemaCore = z.object({
  transfersJson: z
    .string()
    .describe(
      'A JSON string representing an array of token transfer specifications. ' +
        'Each object must have a `type` field (either "fungible" or "nft").' +
        'For `fungible`: `{ type: "fungible", tokenId: string, accountId: string, amount: number | string (smallest unit, + for credit, - for debit) }.' +
        'For `nft`: `{ type: "nft", nftIdString: string (e.g., "0.0.TOKEN/SERIAL"), senderAccountId: string, receiverAccountId: string, isApproved?: boolean }.'
    ),
});

export class HederaTransferTokensTool extends BaseHederaTransactionTool<
  typeof TransferTokensZodSchemaCore
> {
  name = 'hedera-hts-transfer-tokens';
  description =
    'Transfers multiple fungible tokens and/or NFTs in a single transaction. ' +
    'Provide a JSON string for the `transfersJson` parameter detailing each transfer. ' +
    'Use metaOptions for execution control.';
  specificInputSchema = TransferTokensZodSchemaCore;

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof TransferTokensZodSchemaCore>
  ): Promise<void> {
    let parsedJson: any[];
    try {
      parsedJson = JSON.parse(specificArgs.transfersJson);
      if (!Array.isArray(parsedJson) || parsedJson.length === 0) {
        throw new Error('Parsed transfersJson is not a non-empty array.');
      }
    } catch (e: any) {
      this.logger.error('Failed to parse transfersJson string:', e.message);
      throw new Error(`Invalid transfersJson format: ${e.message}`);
    }

    const sdkTokenTransfers: TokenTransferSpec[] = parsedJson.map(
      (item: any, index: number) => {
        const itemNumber = index + 1;
        if (!item.type || (item.type !== 'fungible' && item.type !== 'nft')) {
          throw new Error(
            `Transfer item #${itemNumber} must have a valid 'type' field ('fungible' or 'nft').`
          );
        }

        if (item.type === 'fungible') {
          if (
            item.tokenId === undefined ||
            item.accountId === undefined ||
            item.amount === undefined
          ) {
            throw new Error(
              `Fungible transfer item #${itemNumber} is missing required fields: tokenId, accountId, amount.`
            );
          }
          if (typeof item.tokenId !== 'string') {
            throw new Error(
              `Fungible transfer #${itemNumber} tokenId must be a string.`
            );
          }
          if (typeof item.accountId !== 'string') {
            throw new Error(
              `Fungible transfer #${itemNumber} accountId must be a string.`
            );
          }
          if (
            typeof item.amount !== 'number' &&
            typeof item.amount !== 'string'
          ) {
            throw new Error(
              `Fungible transfer #${itemNumber} amount must be a number or string.`
            );
          }
          return {
            type: 'fungible',
            tokenId: item.tokenId,
            accountId: item.accountId,
            amount:
              typeof item.amount === 'string'
                ? new BigNumber(item.amount)
                : new BigNumber(item.amount),
          } as FungibleTokenTransferSpec;
        } else {
          if (
            !item.nftIdString ||
            !item.senderAccountId ||
            !item.receiverAccountId
          ) {
            throw new Error(
              `NFT transfer item #${itemNumber} is missing required fields: nftIdString, senderAccountId, receiverAccountId.`
            );
          }
          if (typeof item.nftIdString !== 'string') {
            throw new Error(
              `NFT transfer #${itemNumber} nftIdString must be a string.`
            );
          }
          if (typeof item.senderAccountId !== 'string') {
            throw new Error(
              `NFT transfer #${itemNumber} senderAccountId must be a string.`
            );
          }
          if (typeof item.receiverAccountId !== 'string') {
            throw new Error(
              `NFT transfer #${itemNumber} receiverAccountId must be a string.`
            );
          }
          if (item.isApproved && typeof item.isApproved !== 'boolean') {
            throw new Error(
              `NFT transfer #${itemNumber} isApproved must be a boolean if provided.`
            );
          }
          const nftTransferSpec: NonFungibleTokenTransferSpec = {
            type: 'nft',
            nftId: NftId.fromString(item.nftIdString),
            senderAccountId: item.senderAccountId,
            receiverAccountId: item.receiverAccountId,
          };
          if (item.isApproved) {
            nftTransferSpec.isApproved = item.isApproved;
          }
          return nftTransferSpec;
        }
      }
    );

    const transferParams: TransferTokensParams = {
      tokenTransfers: sdkTokenTransfers,
    };

    (builder as HtsBuilder).transferTokens(transferParams);
  }
}
