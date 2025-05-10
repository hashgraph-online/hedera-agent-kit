import { Tool } from '@langchain/core/tools';
import HederaAgentKit from '../../../agent';
import { HederaNetworkType } from '../../../types';

export class HederaGetPendingAirdropTool extends Tool {
  name = 'hedera_get_pending_airdrop';

  description = `Get the pending airdrops for the given account on Hedera
Inputs ( input is a JSON string ):
- accountId: string, the account ID to get the pending airdrop for e.g. 0.0.789012,
Example usage:
1. Get the pending airdrops for account 0.0.789012:
  '{
    "accountId": "0.0.789012"
  }'
`;

  constructor(private hederaKit: HederaAgentKit) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    try {
      console.log('hedera_get_pending_airdrop tool has been called');

      const parsedInput = JSON.parse(input);

      const airdrop = await this.hederaKit.getPendingAirdrops(
        parsedInput.accountId
      );

      return JSON.stringify({
        status: 'success',
        message: 'Pending airdrop retrieved',
        airdrop: airdrop,
      });
    } catch (error: any) {
      return JSON.stringify({
        status: 'error',
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
      });
    }
  }
}
