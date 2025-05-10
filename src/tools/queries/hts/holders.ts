import {
    HederaNetworkType,
    TokenBalance,
    TokenHoldersBalancesApiResponse
} from "../../../types";
import { createBaseMirrorNodeApiUrl } from "../../../utils/api-utils";


export const get_token_holders = async (
    tokenId: string,
    networkType: HederaNetworkType,
    threshold?: number,
): Promise<Array<TokenBalance>> => {
    let baseUrl = createBaseMirrorNodeApiUrl(networkType)

    // 100 results at once, endpoint data updated each 15min
    let url: string | null = threshold !== undefined
        ? `${baseUrl}/api/v1/tokens/${tokenId}/balances?limit=100&account.balance=gte%3A${threshold}`
        : `${baseUrl}/api/v1/tokens/${tokenId}/balances?limit=100&account.balance=gt%3A0`;           // if no threshold set filter out wallets with 0 balances

    const array = new Array<TokenBalance>();

    try {
        while (url) {   // Results are paginated
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: TokenHoldersBalancesApiResponse = await response.json();

            array.push(...data.balances);

            // Update URL for pagination. This endpoint does not return full path to next page, it has to be built first
            url = data.links.next ? baseUrl + data.links.next : null;
        }

        return array;
    } catch (error) {
        console.error("Failed to fetch token holders and their balances. Error:", error);
        throw error;
    }
};
