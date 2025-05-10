import { z } from 'zod';
import { ClaimAirdropParams } from '../../../types';
import { AccountId, TokenId, Long, PendingAirdropId } from '@hashgraph/sdk';
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
    //TODO: Implement
  }
}
