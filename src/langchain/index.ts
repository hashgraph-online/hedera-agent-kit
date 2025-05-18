import { StructuredTool, Tool } from '@langchain/core/tools';
import HederaAgentKit from '../agent';
import * as dotenv from 'dotenv';
import { PrivateKey } from '@hashgraph/sdk';
import { initializeHCS10Client } from '@hashgraphonline/standards-agent-kit';
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

dotenv.config();

/**
 * @description Creates and aggregates all available Hedera LangChain tools.
 * This function is intended to be called by HederaAgentKit during its initialization.
 * @param {HederaAgentKit} hederaKit - The initialized HederaAgentKit instance.
 * @returns {Tool[]} An array of LangChain Tool instances.
 */
export async function createHederaTools(
  hederaKit: HederaAgentKit
): Promise<StructuredTool[]> {
  const toolParams: BaseHederaTransactionToolParams = {
    hederaKit,
    logger: hederaKit.logger,
  };

  const hederaTools: StructuredTool[] = [
    new HederaTransferHbarTool(toolParams),
    new HederaApproveFungibleTokenAllowanceTool(toolParams),
    new HederaApproveHbarAllowanceTool(toolParams),
    new HederaApproveTokenNftAllowanceTool(toolParams),
    new HederaCreateAccountTool(toolParams),
    new HederaDeleteAccountTool(toolParams),
    new HederaUpdateAccountTool(toolParams),
    new HederaRevokeHbarAllowanceTool(toolParams),
    new HederaRevokeFungibleTokenAllowanceTool(toolParams),
    new SignAndExecuteScheduledTransactionTool(toolParams),
    new HederaCreateTopicTool(toolParams),
    new HederaDeleteTopicTool(toolParams),
    new HederaSubmitMessageTool(toolParams),
    new HederaBurnFungibleTokenTool(toolParams),
    new HederaBurnNftTool(toolParams),
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
  ];

  try {
    const operatorData = await hederaKit.getOperator();
    let operatorKeyForStandards: PrivateKey | undefined;
    if (process.env.HEDERA_PRIVATE_KEY) {
      operatorKeyForStandards = PrivateKey.fromString(
        process.env.HEDERA_PRIVATE_KEY
      );
    } else {
      hederaKit.logger.warn(
        'HEDERA_PRIVATE_KEY not found in env, HCS-10 tools might not initialize if signer does not expose private key directly.'
      );
    }

    if (operatorData.id && operatorKeyForStandards) {
      const networkTypeForStandards =
        hederaKit.network === 'mainnet' ? 'mainnet' : 'testnet';

      const standardsKit = initializeHCS10Client({
        clientConfig: {
          operatorId: operatorData.id.toString(),
          operatorKey: operatorKeyForStandards.toStringRaw(),
          network: networkTypeForStandards,
          useEncryption: false,
        },
        createAllTools: true,
      });

      const standardsToolsArray = Object.values(standardsKit.tools).filter(
        Boolean
      );

      hederaKit.logger.info(
        `Initialized ${standardsToolsArray.length} HCS-10 tools.`
      );
      return [
        ...hederaTools,
        ...standardsToolsArray,
      ] as unknown as StructuredTool[];
    }
  } catch (error: unknown) {
    const e = error as Error;
    hederaKit.logger.error(
      'Failed to initialize HCS-10 Standards Agent Kit tools:',
      e.message
    );
  }

  return hederaTools;
}

export { BaseHederaTransactionTool } from './tools/common/base-hedera-transaction-tool';

export { HederaCreateTopicTool } from './tools/hcs/create-topic-tool';
export { HederaDeleteTopicTool } from './tools/hcs/delete-topic-tool';
export { HederaSubmitMessageTool } from './tools/hcs/submit-message-tool';
export { HederaUpdateTopicTool } from './tools/hcs/update-topic-tool';

export { HederaAirdropTokenTool } from './tools/hts/airdrop-token-tool';
export { HederaAssociateTokensTool } from './tools/hts/associate-tokens-tool';
export { HederaClaimAirdropTool } from './tools/hts/claim-airdrop-tool';
export { HederaCreateFungibleTokenTool } from './tools/hts/create-fungible-token-tool';
export { HederaCreateNftTool } from './tools/hts/create-nft-tool';
export { HederaGetAllTokenBalancesTool } from './tools/hts/get-token-balances-tool';
export { HederaGetPendingAirdropTool } from './tools/hts/get-pending-airdrops';
export { HederaGetTokenHoldersTool } from './tools/hts/get-token-holders';
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

export { HederaApproveFungibleTokenAllowanceTool } from './tools/account/approve-fungible-token-allowance-tool';
export { HederaApproveHbarAllowanceTool } from './tools/account/approve-hbar-allowance-tool';
export { HederaApproveTokenNftAllowanceTool } from './tools/account/approve-token-nft-allowance-tool';
export { HederaCreateAccountTool } from './tools/account/create-account-tool';
export { HederaDeleteAccountTool } from './tools/account/delete-account-tool';
export { HederaUpdateAccountTool } from './tools/account/update-account-tool';
export { HederaTransferHbarTool } from './tools/account/transfer-hbar-tool';
export { HederaRevokeHbarAllowanceTool } from './tools/account/revoke-hbar-allowance-tool';
export { HederaRevokeFungibleTokenAllowanceTool } from './tools/account/revoke-fungible-token-allowance-tool';

export { HederaCreateFileTool } from './tools/file/create-file-tool';
export { HederaAppendFileTool } from './tools/file/append-file-tool';
export { HederaUpdateFileTool } from './tools/file/update-file-tool';
export { HederaDeleteFileTool } from './tools/file/delete-file-tool';
export { HederaGetFileContentsTool } from './tools/file/get-file-contents-tool';

export { HederaCreateContractTool } from './tools/scs/create-contract-tool';
export { HederaUpdateContractTool } from './tools/scs/update-contract-tool';
export { HederaDeleteContractTool } from './tools/scs/delete-contract-tool';
export { HederaExecuteContractTool } from './tools/scs/execute-contract-tool';
