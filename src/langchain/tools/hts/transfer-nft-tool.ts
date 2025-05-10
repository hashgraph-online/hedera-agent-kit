import { z } from 'zod';
import { HederaAgentKit } from '../../../agent';
import { TransferNFTParams } from '../../../types';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { AccountId, NftId, TokenId } from '@hashgraph/sdk'; // Added TokenId for NftId.fromString potentially
import {
    BaseHederaTransactionTool,
    BaseHederaTransactionToolParams
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const TransferNftZodSchemaCore = z.object({
  nftIdString: z.string().describe('The NftId as a string (e.g., \"0.0.TOKEN/SERIAL\").'),
  senderAccountId: z.string().describe('The sender account ID (e.g., \"0.0.xxxx\").'),
  receiverAccountId: z.string().describe('The receiver account ID (e.g., \"0.0.yyyy\").'),
  isApproved: z.boolean().optional().describe('Set to true if the sender is an approved operator for the NFT.'),
});

export class HederaTransferNftTool extends BaseHederaTransactionTool<typeof TransferNftZodSchemaCore> {
  name = 'hedera-hts-transfer-nft';
  description = 'Transfers a single Non-Fungible Token (NFT). Requires nftId (as string \"token/serial\"), senderAccountId, and receiverAccountId. Optionally specify isApproved. Use metaOptions for execution control.';
  specificInputSchema = TransferNftZodSchemaCore;

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
    const transferParams: TransferNFTParams = {
      nftId: NftId.fromString(specificArgs.nftIdString),
      senderAccountId: specificArgs.senderAccountId,
      receiverAccountId: specificArgs.receiverAccountId,
    };
    if (specificArgs.isApproved ) {
      transferParams.isApproved = specificArgs.isApproved;
    }
    (builder as HtsBuilder).transferNft(transferParams);
  }
}