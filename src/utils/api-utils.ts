import { HederaNetworkType } from "../types";

export const createBaseMirrorNodeApiUrl = (networkType: HederaNetworkType) => {
    const networkBase = networkType === 'mainnet' ? `${networkType}-public` : networkType;
    return `https://${networkBase}.mirrornode.hedera.com`
}
