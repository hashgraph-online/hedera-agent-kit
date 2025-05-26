import { z } from 'zod';
import { ClaimAirdropParams } from '../../../types';
import { AccountId, TokenId, Long, PendingAirdropId, NftId } from '@hashgraph/sdk';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const ClaimAirdropZodSchemaCore = z.object({
  pendingAirdrops: z
    .array(
      z.object({
        senderAccountId: z
          .string()
          .describe('The account ID of the sender of the airdrop.'),
        tokenId: z.string().describe('The token ID of the airdropped token.'),
        serialNumber: z
          .union([z.number(), z.string()])
          .describe(
            'The serial number for an NFT, or a string/number convertible to Long(0) for fungible token claims (representing the whole pending amount for that FT from that sender).'
          ),
      })
    )
    .min(1)
    .max(10)
    .describe(
      'An array of pending airdrops to claim. Each object must have senderAccountId, tokenId, and serialNumber. Max 10 entries.'
    ),
});

export class HederaClaimAirdropTool extends BaseHederaTransactionTool<
  typeof ClaimAirdropZodSchemaCore
> {
  name = 'hedera-hts-claim-airdrop';
  description =
    'Claims pending airdropped tokens (fungible or NFT serials). Requires an array of airdrop objects, each specifying senderAccountId, tokenId, and serialNumber. Use metaOptions for execution control.';
  specificInputSchema = ClaimAirdropZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof ClaimAirdropZodSchemaCore>
  ): Promise<void> {
    const sdkPendingAirdropIds: PendingAirdropId[] =
      specificArgs.pendingAirdrops.map((item, index: number) => {
        const itemNumber = index + 1;

        let serialValue: Long;
        if (typeof item.serialNumber === 'string') {
          try {
            serialValue = Long.fromString(item.serialNumber);
          } catch (e: unknown) {
            const error = e as Error;
            throw new Error(
              `Pending airdrop item #${itemNumber} serialNumber string ('${item.serialNumber}') is not a valid Long: ${error.message}`
            );
          }
        } else {
          serialValue = Long.fromNumber(item.serialNumber);
        }

        try {
          const senderId = AccountId.fromString(item.senderAccountId);
          const tokId = TokenId.fromString(item.tokenId);
          return new PendingAirdropId({
            senderId,
            tokenId: tokId,
            nftId: NftId.fromString(serialValue.toString()),
          });
        } catch (e: unknown) {
          const error = e as Error;
          throw new Error(
            `Error constructing PendingAirdropId for item #${itemNumber} (sender: ${item.senderAccountId}, token: ${item.tokenId}, serial: ${item.serialNumber}): ${error.message}`
          );
        }
      });

    const claimParams: ClaimAirdropParams = {
      pendingAirdropIds: sdkPendingAirdropIds,
    };

    (builder as HtsBuilder).claimAirdrop(claimParams);
  }
}
