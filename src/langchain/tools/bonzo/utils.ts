import { BonzoContractsConfig, BonzoTokenInfo, NetworkType, MirrorNodeAccountsResponse } from "./types";
// Directly import the JSON configuration
// Corrected path
import bonzoContractsData from "../../../config/bonzo-contracts.json";

/**
 * Load Bonzo contracts configuration
 */
export function loadBonzoContracts(): BonzoContractsConfig {
  try {
    return bonzoContractsData as BonzoContractsConfig;
  } catch (error) {
    throw new Error(`Failed to load Bonzo contracts configuration: ${error}`);
  }
}

/**
 * Map network names to the format used in contracts
 */
export function mapNetworkName(network: NetworkType): "hedera_mainnet" | "hedera_testnet" {
  switch (network) {
    case "mainnet":
      return "hedera_mainnet";
    case "testnet":
    case "previewnet": // Fallback previewnet to testnet configuration
      return "hedera_testnet";
    default:
      // Should not happen due to NetworkType, but as a safeguard:
      console.warn(`Unknown network type: ${network}, defaulting to hedera_testnet.`);
      return "hedera_testnet";
  }
}

/**
 * Get token information for a specific asset and network
 */
export function getTokenInfo(network: NetworkType, assetSymbol: string): BonzoTokenInfo | null {
  const contracts = loadBonzoContracts();
  const networkKey = mapNetworkName(network);

  // Try exact match first
  if (contracts[assetSymbol]) {
    const tokenConfig = contracts[assetSymbol] as any; // Type assertion
    const networkConfig = tokenConfig[networkKey];
    if (networkConfig && networkConfig.aToken?.address) {
      return networkConfig as BonzoTokenInfo;
    }
  }

  // Try case-insensitive match if exact match fails
  for (const [symbol, tokenConfigUntyped] of Object.entries(contracts)) {
    if (symbol.toLowerCase() === assetSymbol.toLowerCase()) {
      const tokenConfig = tokenConfigUntyped as any; // Type assertion
      const networkContracts = tokenConfig as any; // Assuming it's BonzoNetworkContracts structure
      if (networkContracts[networkKey] && networkContracts[networkKey].aToken?.address) {
        return networkContracts[networkKey] as BonzoTokenInfo;
      }
    }
  }
  return null;
}

/**
 * Get EVM address for a given Hedera account ID from the public mirror node.
 * @param accountId The Hedera account ID (e.g., "0.0.12345").
 * @param network The network to query (mainnet, testnet, previewnet).
 * @returns The EVM address (hex string with 0x prefix) or null if not found/error.
 */
export async function getAccountEvmAddressFromMirrorNode(accountId: string, network: NetworkType): Promise<string | null> {
  const mirrorNodeBaseUrl = network === "mainnet" ? "https://mainnet-public.mirrornode.hedera.com" : `https://${network}.mirrornode.hedera.com`; // testnet, previewnet use network name directly

  const url = `${mirrorNodeBaseUrl}/api/v1/accounts/${accountId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Mirror node request failed for ${accountId} on ${network}: ${response.status} ${response.statusText}`);
      const errorBody = await response.text(); // consume error body to prevent unhandled promise rejection
      console.error(`Error body: ${errorBody}`);
      return null;
    }
    const data: MirrorNodeAccountsResponse = await response.json();
    if (data.accounts && data.accounts.length > 0 && data.accounts[0].evm_address) {
      const evmAddress = data.accounts[0].evm_address;
      // Ensure 0x prefix
      return evmAddress.startsWith("0x") ? evmAddress : `0x${evmAddress}`;
    }
    console.warn(`EVM address not found for ${accountId} in mirror node response on ${network}.`);
    return null;
  } catch (error) {
    console.error(`Error fetching EVM address for ${accountId} from mirror node on ${network}:`, error);
    return null;
  }
}
