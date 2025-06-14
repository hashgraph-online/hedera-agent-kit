import HederaAgentKit from '../agent/agent';
import { HederaTool } from '../plugins/PluginInterface';
import * as dotenv from 'dotenv';
import { PrivateKey } from '@hashgraph/sdk';
import { HederaCreateTopicTool } from './tools/hcs/create-topic-tool';
import { HederaDeleteTopicTool } from './tools/hcs/delete-topic-tool';
import { HederaSubmitMessageTool } from './tools/hcs/submit-message-tool';
import { HederaClaimAirdropTool } from './tools/hts/claim-airdrop-tool';
import { HederaCreateFungibleTokenTool } from './tools/hts/create-fungible-token-tool';
import { HederaCreateNftTool } from './tools/hts/create-nft-tool';
import { HederaMintFungibleTokenTool } from './tools/hts/mint-fungible-token-tool';
import { HederaMintNftTool } from './tools/hts/mint-nft-tool';
import { HederaRejectTokensTool } from './tools/hts/reject-tokens-tool';
import { HederaTransferTokensTool } from './tools/hts/transfer-tokens-tool';
import { HederaDissociateTokensTool } from './tools/hts/dissociate-tokens-tool';
import { HederaUpdateTokenTool } from './tools/hts/update-token-tool';
import { HederaDeleteTokenTool } from './tools/hts/delete-token-tool';
import { HederaPauseTokenTool } from './tools/hts/pause-token-tool';
import { HederaUnpauseTokenTool } from './tools/hts/unpause-token-tool';
import { HederaFreezeTokenAccountTool } from './tools/hts/freeze-token-account-tool';
import { HederaUnfreezeTokenAccountTool } from './tools/hts/unfreeze-token-account-tool';
import { HederaGrantKycTokenTool } from './tools/hts/grant-kyc-token-tool';
import { HederaRevokeKycTokenTool } from './tools/hts/revoke-kyc-token-tool';
import { HederaWipeTokenAccountTool } from './tools/hts/wipe-token-account-tool';
import { HederaTokenFeeScheduleUpdateTool } from './tools/hts/token-fee-schedule-update-tool';
import { HederaTransferNftTool } from './tools/hts/transfer-nft-tool';
import { HederaBurnFungibleTokenTool } from './tools/hts/burn-fungible-token-tool';
import { HederaBurnNftTool } from './tools/hts/burn-nft-tool';
import { HederaApproveFungibleTokenAllowanceTool } from './tools/account/approve-fungible-token-allowance-tool';
import { HederaApproveHbarAllowanceTool } from './tools/account/approve-hbar-allowance-tool';
import { HederaApproveTokenNftAllowanceTool } from './tools/account/approve-token-nft-allowance-tool';
import { HederaCreateAccountTool } from './tools/account/create-account-tool';
import { HederaDeleteAccountTool } from './tools/account/delete-account-tool';
import { HederaUpdateAccountTool } from './tools/account/update-account-tool';
import { HederaTransferHbarTool } from './tools/account/transfer-hbar-tool';
import { HederaRevokeHbarAllowanceTool } from './tools/account/revoke-hbar-allowance-tool';
import { HederaRevokeFungibleTokenAllowanceTool } from './tools/account/revoke-fungible-token-allowance-tool';
import { SignAndExecuteScheduledTransactionTool } from './tools/account/sign-and-execute-scheduled-transaction-tool';
import { HederaCreateFileTool } from './tools/file/create-file-tool';
import { HederaAppendFileTool } from './tools/file/append-file-tool';
import { HederaUpdateFileTool } from './tools/file/update-file-tool';
import { HederaDeleteFileTool } from './tools/file/delete-file-tool';
import { HederaCreateContractTool } from './tools/scs/create-contract-tool';
import { HederaUpdateContractTool } from './tools/scs/update-contract-tool';
import { HederaDeleteContractTool } from './tools/scs/delete-contract-tool';
import { HederaExecuteContractTool } from './tools/scs/execute-contract-tool';
import { BaseHederaTransactionToolParams } from './tools/common/base-hedera-transaction-tool';
import { BaseHederaQueryToolParams } from './tools/common/base-hedera-query-tool';
import { ModelCapability } from '../types/model-capability';
import { HederaGetTopicInfoTool } from './tools/hcs/get-topic-info-tool';
import { HederaGetTopicFeesTool } from './tools/hcs/get-topic-fees-tool';
import { HederaGetAccountBalanceTool } from './tools/account/get-account-balance-tool';
import { HederaGetAccountPublicKeyTool } from './tools/account/get-account-public-key-tool';
import { HederaGetAccountInfoTool } from './tools/account/get-account-info-tool';
import { HederaGetAccountTokensTool } from './tools/account/get-account-tokens-tool';
import { HederaGetAccountNftsTool } from './tools/account/get-account-nfts-tool';
import { HederaGetTokenInfoTool } from './tools/hts/get-token-info-tool';
import { HederaValidateNftOwnershipTool } from './tools/hts/validate-nft-ownership-tool';
import { HederaGetHbarPriceTool } from './tools/network/get-hbar-price-tool';
import { HederaGetTransactionTool } from './tools/transaction/get-transaction-tool';
import { HederaGetOutstandingAirdropsTool } from './tools/account/get-outstanding-airdrops-tool';
import { HederaGetPendingAirdropsTool } from './tools/account/get-pending-airdrops-tool';
import { HederaGetBlocksTool } from './tools/network/get-blocks-tool';
import { HederaGetContractsTool } from './tools/scs/get-contracts-tool';
import { HederaGetContractTool } from './tools/scs/get-contract-tool';
import { HederaGetNetworkInfoTool } from './tools/network/get-network-info-tool';
import { HederaGetNetworkFeesTool } from './tools/network/get-network-fees-tool';
import { HederaAirdropTokenTool } from './tools/hts/airdrop-token-tool';
import { HederaAssociateTokensTool } from './tools/hts/associate-tokens-tool';
import { HederaUpdateTopicTool } from './tools/hcs/update-topic-tool';
import { HederaGetTopicMessages } from './tools/hcs/get-topic-messages-tool';
import { HederaGetFileContentsTool } from './tools/file/get-file-contents-tool';
import { HederaDeleteNftSpenderAllowanceTool } from './tools/account/delete-nft-spender-allowance-tool';
import { HederaDeleteNftSerialAllowancesTool } from './tools/account/delete-nft-allowance-all-serials-tool';

dotenv.config();

/**
 * @description Creates and aggregates all available Hedera LangChain tools.
 * This function is intended to be called by HederaAgentKit during its initialization.
 * @param {HederaAgentKit} hederaKit - The initialized HederaAgentKit instance.
 * @param {string} operatorId - The operator account ID.
 * @param {PrivateKey} operatorKey - The operator private key.
 * @param {ModelCapability} modelCapability - The model capability for response processing.
 * @returns {Tool[]} An array of LangChain Tool instances.
 */
export async function createHederaTools(
  hederaKit: HederaAgentKit,
  operatorId?: string,
  operatorKey?: PrivateKey,
  modelCapability: ModelCapability = ModelCapability.MEDIUM
): Promise<HederaTool[]> {
  const toolParams: BaseHederaTransactionToolParams = {
    hederaKit,
    logger: hederaKit.logger,
  };

  const queryToolParams: BaseHederaQueryToolParams = {
    hederaKit,
    logger: hederaKit.logger,
    modelCapability,
  };

  const hederaTools: HederaTool[] = [
    new HederaTransferHbarTool(toolParams),
    new HederaApproveFungibleTokenAllowanceTool(toolParams),
    new HederaApproveHbarAllowanceTool(toolParams),
    new HederaApproveTokenNftAllowanceTool(toolParams),
    new HederaCreateAccountTool(toolParams),
    new HederaDeleteAccountTool(toolParams),
    new HederaUpdateAccountTool(toolParams),
    new HederaRevokeHbarAllowanceTool(toolParams),
    new HederaRevokeFungibleTokenAllowanceTool(toolParams),
    new HederaDeleteNftSpenderAllowanceTool(toolParams),
    new HederaDeleteNftSerialAllowancesTool(toolParams),
    new SignAndExecuteScheduledTransactionTool(toolParams),
    new HederaCreateTopicTool(toolParams),
    new HederaDeleteTopicTool(toolParams),
    new HederaUpdateTopicTool(toolParams),
    new HederaSubmitMessageTool(toolParams),
    new HederaBurnFungibleTokenTool(toolParams),
    new HederaBurnNftTool(toolParams),
    new HederaAirdropTokenTool(toolParams),
    new HederaAssociateTokensTool(toolParams),
    new HederaClaimAirdropTool(toolParams),
    new HederaCreateFungibleTokenTool(toolParams),
    new HederaCreateNftTool(toolParams),
    new HederaDeleteTokenTool(toolParams),
    new HederaDissociateTokensTool(toolParams),
    new HederaFreezeTokenAccountTool(toolParams),
    new HederaGrantKycTokenTool(toolParams),
    new HederaMintFungibleTokenTool(toolParams),
    new HederaMintNftTool(toolParams),
    new HederaPauseTokenTool(toolParams),
    new HederaRejectTokensTool(toolParams),
    new HederaRevokeKycTokenTool(toolParams),
    new HederaTokenFeeScheduleUpdateTool(toolParams),
    new HederaTransferNftTool(toolParams),
    new HederaTransferTokensTool(toolParams),
    new HederaUnfreezeTokenAccountTool(toolParams),
    new HederaUnpauseTokenTool(toolParams),
    new HederaUpdateTokenTool(toolParams),
    new HederaWipeTokenAccountTool(toolParams),
    new HederaCreateFileTool(toolParams),
    new HederaAppendFileTool(toolParams),
    new HederaUpdateFileTool(toolParams),
    new HederaDeleteFileTool(toolParams),
    new HederaCreateContractTool(toolParams),
    new HederaUpdateContractTool(toolParams),
    new HederaDeleteContractTool(toolParams),
    new HederaExecuteContractTool(toolParams),
    new HederaGetTopicInfoTool(queryToolParams),
    new HederaGetTopicFeesTool(queryToolParams),
    new HederaGetTopicMessages(queryToolParams),
    new HederaGetAccountBalanceTool(queryToolParams),
    new HederaGetAccountPublicKeyTool(queryToolParams),
    new HederaGetAccountInfoTool(queryToolParams),
    new HederaGetAccountTokensTool(queryToolParams),
    new HederaGetAccountNftsTool(queryToolParams),
    new HederaGetOutstandingAirdropsTool(queryToolParams),
    new HederaGetPendingAirdropsTool(queryToolParams),
    new HederaGetTokenInfoTool(queryToolParams),
    new HederaValidateNftOwnershipTool(queryToolParams),
    new HederaGetHbarPriceTool(queryToolParams),
    new HederaGetTransactionTool(queryToolParams),
    new HederaGetBlocksTool(queryToolParams),
    new HederaGetContractsTool(queryToolParams),
    new HederaGetContractTool(queryToolParams),
    new HederaGetNetworkInfoTool(queryToolParams),
    new HederaGetNetworkFeesTool(queryToolParams),
    new HederaGetFileContentsTool(queryToolParams),
  ];

  hederaKit.logger.info(
    `Created ${hederaTools.length} tools with model capability: ${modelCapability}`
  );

  return hederaTools;
}

export { BaseHederaTransactionTool } from './tools/common/base-hedera-transaction-tool';
export { BaseHederaQueryTool } from './tools/common/base-hedera-query-tool';
export { HederaCreateTopicTool } from './tools/hcs/create-topic-tool';
export { HederaDeleteTopicTool } from './tools/hcs/delete-topic-tool';
export { HederaSubmitMessageTool } from './tools/hcs/submit-message-tool';
export { HederaUpdateTopicTool } from './tools/hcs/update-topic-tool';
export { HederaGetTopicInfoTool } from './tools/hcs/get-topic-info-tool';
export { HederaGetTopicFeesTool } from './tools/hcs/get-topic-fees-tool';
export { HederaGetTopicMessages } from './tools/hcs/get-topic-messages-tool';

export { HederaAirdropTokenTool } from './tools/hts/airdrop-token-tool';
export { HederaAssociateTokensTool } from './tools/hts/associate-tokens-tool';
export { HederaClaimAirdropTool } from './tools/hts/claim-airdrop-tool';
export { HederaCreateFungibleTokenTool } from './tools/hts/create-fungible-token-tool';
export { HederaCreateNftTool } from './tools/hts/create-nft-tool';

export { HederaMintFungibleTokenTool } from './tools/hts/mint-fungible-token-tool';
export { HederaMintNftTool } from './tools/hts/mint-nft-tool';
export { HederaRejectTokensTool } from './tools/hts/reject-tokens-tool';
export { HederaTransferTokensTool } from './tools/hts/transfer-tokens-tool';
export { HederaDissociateTokensTool } from './tools/hts/dissociate-tokens-tool';
export { HederaUpdateTokenTool } from './tools/hts/update-token-tool';
export { HederaDeleteTokenTool } from './tools/hts/delete-token-tool';
export { HederaPauseTokenTool } from './tools/hts/pause-token-tool';
export { HederaUnpauseTokenTool } from './tools/hts/unpause-token-tool';
export { HederaFreezeTokenAccountTool } from './tools/hts/freeze-token-account-tool';
export { HederaUnfreezeTokenAccountTool } from './tools/hts/unfreeze-token-account-tool';
export { HederaGrantKycTokenTool } from './tools/hts/grant-kyc-token-tool';
export { HederaRevokeKycTokenTool } from './tools/hts/revoke-kyc-token-tool';
export { HederaWipeTokenAccountTool } from './tools/hts/wipe-token-account-tool';
export { HederaTokenFeeScheduleUpdateTool } from './tools/hts/token-fee-schedule-update-tool';
export { HederaTransferNftTool } from './tools/hts/transfer-nft-tool';
export { HederaBurnFungibleTokenTool } from './tools/hts/burn-fungible-token-tool';
export { HederaBurnNftTool } from './tools/hts/burn-nft-tool';
export { HederaGetTokenInfoTool } from './tools/hts/get-token-info-tool';
export { HederaValidateNftOwnershipTool } from './tools/hts/validate-nft-ownership-tool';

export { HederaApproveFungibleTokenAllowanceTool } from './tools/account/approve-fungible-token-allowance-tool';
export { HederaApproveHbarAllowanceTool } from './tools/account/approve-hbar-allowance-tool';
export { HederaApproveTokenNftAllowanceTool } from './tools/account/approve-token-nft-allowance-tool';
export { HederaCreateAccountTool } from './tools/account/create-account-tool';
export { HederaDeleteAccountTool } from './tools/account/delete-account-tool';
export { HederaUpdateAccountTool } from './tools/account/update-account-tool';
export { HederaTransferHbarTool } from './tools/account/transfer-hbar-tool';
export { HederaRevokeHbarAllowanceTool } from './tools/account/revoke-hbar-allowance-tool';
export { HederaRevokeFungibleTokenAllowanceTool } from './tools/account/revoke-fungible-token-allowance-tool';
export { HederaGetAccountBalanceTool } from './tools/account/get-account-balance-tool';
export { HederaGetAccountPublicKeyTool } from './tools/account/get-account-public-key-tool';
export { HederaGetAccountInfoTool } from './tools/account/get-account-info-tool';
export { HederaGetAccountTokensTool } from './tools/account/get-account-tokens-tool';
export { HederaGetAccountNftsTool } from './tools/account/get-account-nfts-tool';

export { HederaCreateFileTool } from './tools/file/create-file-tool';
export { HederaAppendFileTool } from './tools/file/append-file-tool';
export { HederaUpdateFileTool } from './tools/file/update-file-tool';
export { HederaDeleteFileTool } from './tools/file/delete-file-tool';
export { HederaGetFileContentsTool } from './tools/file/get-file-contents-tool';

export { HederaCreateContractTool } from './tools/scs/create-contract-tool';
export { HederaUpdateContractTool } from './tools/scs/update-contract-tool';
export { HederaDeleteContractTool } from './tools/scs/delete-contract-tool';
export { HederaExecuteContractTool } from './tools/scs/execute-contract-tool';

export { HederaGetHbarPriceTool } from './tools/network/get-hbar-price-tool';
export { HederaGetTransactionTool } from './tools/transaction/get-transaction-tool';

export * from './tools/hcs10';
