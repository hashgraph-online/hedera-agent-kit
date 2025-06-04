import { Contract, JsonRpcProvider, formatUnits as ethersFormatUnits } from "ethers";
import { BaseServiceBuilder } from "../base-service-builder";
import { HederaAgentKit } from "../../agent/agent";
import { GetBonzoATokenBalanceParams } from "../../types";

/**
 * BonzoBuilder facilitates querying Bonzo finance protocol on Hedera.
 */
export class BonzoBuilder extends BaseServiceBuilder {
  constructor(hederaKit: HederaAgentKit) {
    super(hederaKit);
  }

  /**
   * Get aToken balance for a given account and asset symbol from Bonzo platform
   * @param {GetBonzoATokenBalanceParams} params
   * @returns {Promise<{ balance: string; symbol: string; decimals: number; formattedBalance: string }>}
   */
  public async getATokenBalance(params: GetBonzoATokenBalanceParams): Promise<{
    balance: string;
    symbol: string;
    decimals: number;
    formattedBalance: string;
  }> {
    const { assetSymbol, accountId } = params;

    // Convert AccountId to string if needed
    const accountIdString = typeof accountId === "string" ? accountId : accountId.toString();

    // Import the utility functions
    const { getTokenInfo, getAccountEvmAddressFromMirrorNode } = await import("../../langchain/tools/bonzo/utils");

    // Determine network from HederaAgentKit
    const network = this.kit.network as "mainnet" | "testnet" | "previewnet";

    const tokenInfo = getTokenInfo(network, assetSymbol);
    if (!tokenInfo || !tokenInfo.aToken?.address) {
      throw new Error(`aToken not found for asset ${assetSymbol} on network ${network}. Check configuration.`);
    }

    const userEvmAddress = await getAccountEvmAddressFromMirrorNode(accountIdString, network);
    if (!userEvmAddress) {
      throw new Error(`Could not retrieve EVM address for account ${accountIdString} from mirror node on ${network}.`);
    }

    const erc20Abi = ["function balanceOf(address account) view returns (uint256)", "function decimals() view returns (uint8)"];

    try {
      let rpcUrl;
      if (network === "mainnet") {
        rpcUrl = "https://mainnet.hashio.io/api";
      } else {
        rpcUrl = "https://testnet.hashio.io/api";
      }

      const provider = new JsonRpcProvider(rpcUrl);
      const aTokenContract = new Contract(tokenInfo.aToken.address, erc20Abi, provider);

      const balanceBigInt = await aTokenContract.balanceOf(userEvmAddress);
      const decimalsBigInt = await aTokenContract.decimals();
      const decimals = Number(decimalsBigInt);

      const balance = balanceBigInt.toString();
      const formattedBalance = ethersFormatUnits(balanceBigInt, decimals);

      return {
        balance,
        symbol: `a${assetSymbol}`,
        decimals,
        formattedBalance,
      };
    } catch (error: any) {
      let errMsg = `Error querying aToken ${assetSymbol} (${tokenInfo.aToken.address}) for account ${accountIdString} (${userEvmAddress}) on ${network}`;
      if (error.message) errMsg += `: ${error.message}`;
      if (error.data?.message) errMsg += ` - RPC Error: ${error.data.message}`;
      this.logger.error("BonzoBuilder.getATokenBalance Error:", error);
      throw new Error(errMsg);
    }
  }
}
