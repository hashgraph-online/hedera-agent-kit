import { z } from 'zod';
import { TransferNFTParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const TransferNftZodSchemaCore = z.object({
  tokenId: z.string().describe('The token ID of the NFT (e.g., "0.0.xxxx").'),
  serial: z
    .union([z.number().int().positive(), z.string()])
    .describe('The serial number of the NFT.'),
  senderAccountId: z
    .string()
    .describe('The sender account ID (e.g., "0.0.xxxx").'),
  receiverAccountId: z
    .string()
    .describe('The receiver account ID (e.g., "0.0.yyyy").'),
  isApproved: z
    .boolean()
    .optional()
    .describe('Optional. True if sender is an approved operator for the NFT.'),
  memo: z.string().optional().describe('Optional. Memo for the transaction.'),
});

export class HederaTransferNftTool extends BaseHederaTransactionTool<
  typeof TransferNftZodSchemaCore
> {
  name = 'hedera-hts-transfer-nft';
  description = 'Transfers a single Non-Fungible Token (NFT).';
  specificInputSchema = TransferNftZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof TransferNftZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).transferNft(
      specificArgs as unknown as TransferNFTParams
    );
  }
}
