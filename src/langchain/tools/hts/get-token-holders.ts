import { Tool } from '@langchain/core/tools';
import HederaAgentKit from '../../../agent/agent';
import { toBaseUnit } from '../../../utils/hts-format-utils';
import { fromBaseToDisplayUnit } from '../../../utils/format-units';

export class HederaGetTokenHoldersTool extends Tool {
  name = 'hedera_get_token_holders';

  description = `Get the holders of a token on Hedera
Inputs ( input is a JSON string ):
tokenId: string, the ID of the token to get the holders for e.g. 0.0.123456,
threshold (optional): number, the threshold of the token to get the holders for e.g. 100,
Example usage:
1. Get the holders of token 0.0.123456 with a threshold of 100:
  '{
    "tokenId": "0.0.123456",
    "threshold": 100
  }
}
`;

  constructor(private hederaKit: HederaAgentKit) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    try {
      console.log('hedera_get_token_holders tool has been called');

      const parsedInput = JSON.parse(input);
      const threshold = parsedInput.threshold
        ? Number(
            (
              await toBaseUnit(
                parsedInput.tokenId as string,
                parsedInput.threshold,
                this.hederaKit.network
              )
            ).toString()
          )
        : undefined;

      // returns balances in base unit
      const holders = await this.hederaKit.getTokenHolders(
        parsedInput.tokenId,
        threshold
      );

      const formattedHolders = holders.map((holder) => ({
        account: holder.account,
        balance: fromBaseToDisplayUnit(
          holder.balance,
          holder.decimals
        ).toString(),
        decimals: holder.decimals,
      }));

      return JSON.stringify({
        status: 'success',
        message: 'Token holders retrieved',
        holders: formattedHolders,
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
