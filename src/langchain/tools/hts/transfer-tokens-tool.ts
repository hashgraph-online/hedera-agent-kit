import { z } from 'zod';
import { TransferTokensParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const FungibleTokenTransferInputSchema = z.object({
  type: z.literal('fungible'),
  tokenId: z.string().describe('Token ID (e.g., "0.0.xxxx").'),
  accountId: z
    .string()
    .describe('Account ID for the transfer (e.g., "0.0.yyyy").'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'Amount in smallest unit. Positive for credit, negative for debit. Builder handles conversion.'
    ),
});

const NftTransferInputSchema = z.object({
  type: z.literal('nft'),
  tokenId: z.string().describe('Token ID of the NFT (e.g., "0.0.xxxx").'),
  serial: z
    .union([z.number().int().positive(), z.string()])
    .describe('Serial number of the NFT.'),
  senderAccountId: z.string().describe('Sender account ID (e.g., "0.0.ssss").'),
  receiverAccountId: z
    .string()
    .describe('Receiver account ID (e.g., "0.0.rrrr").'),
  isApproved: z
    .boolean()
    .optional()
    .describe('Optional. True if sender is an approved operator.'),
});

const HbarTransferInputSchema = z.object({
  accountId: z
    .string()
    .describe('Account ID for the HBAR transfer (e.g., "0.0.zzzz").'),
  amount: z
    .union([z.number(), z.string()])
    .describe(
      'HBAR amount in tinybars. Positive for credit, negative for debit. Builder handles Hbar unit conversion.'
    ),
});

const TransferTokensZodObjectSchema = z.object({
  tokenTransfers: z
    .array(
      z.discriminatedUnion('type', [
        FungibleTokenTransferInputSchema,
        NftTransferInputSchema,
      ])
    )
    .min(1)
    .describe('Array of fungible token and/or NFT transfers.'),
  hbarTransfers: z
    .array(HbarTransferInputSchema)
    .optional()
    .describe(
      'Optional. Array of HBAR transfers. Sum of amounts must be zero.'
    ),
  memo: z
    .string()
    .optional()
    .describe('Optional. Memo for the entire transaction.'),
});

export class HederaTransferTokensTool extends BaseHederaTransactionTool<
  //@ts-ignore
  typeof TransferTokensZodObjectSchema
> {
  name = 'hedera-hts-transfer-tokens';
  description =
    'Transfers multiple fungible tokens, NFTs, and/or HBAR in a single transaction. Builder handles parsing and validation.';
  specificInputSchema = TransferTokensZodObjectSchema;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof TransferTokensZodObjectSchema>
  ): Promise<void> {
    await (builder as HtsBuilder).transferTokens(
      specificArgs as unknown as TransferTokensParams
    );
  }
}
