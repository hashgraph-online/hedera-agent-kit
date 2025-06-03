export type NetworkType = "mainnet" | "testnet" | "previewnet";

export interface BonzoTokenInfo {
  token: {
    address: string;
  };
  aToken: {
    address: string;
  };
  stableDebt: {
    address: string;
  };
  variableDebt: {
    address: string;
  };
}

export interface BonzoNetworkContracts {
  [tokenSymbol: string]: {
    hedera_testnet?: BonzoTokenInfo;
    hedera_mainnet?: BonzoTokenInfo;
  };
}

export interface BonzoCoreContract {
  hedera_testnet?: {
    address: string;
    deployer?: string;
  };
  hedera_mainnet?: {
    address: string;
    deployer?: string;
  };
}

export interface BonzoContractsConfig {
  [key: string]: BonzoNetworkContracts | BonzoCoreContract;
}

// Simplified types for mirror node account fetching
export interface MirrorNodeAccountInfo {
  evm_address: string;
  // Add other fields if they become necessary for other tools
}

export interface MirrorNodeAccountsResponse {
  accounts: MirrorNodeAccountInfo[];
  // links, etc., if pagination is ever handled by this utility
}
