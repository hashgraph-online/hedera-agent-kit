import { Hbar } from '@hashgraph/sdk';
import { TransferTransaction } from '@hashgraph/sdk';
import {
  Logger,
  HederaMirrorNode,
  NetworkType,
} from '@hashgraphonline/standards-sdk';

export const MIN_REQUIRED_USD = 2.0;
export const MIN_REQUIRED_HBAR_USD = 10.0;

export async function ensureAgentHasEnoughHbar(
  logger: Logger,
  network: 'mainnet' | 'testnet',
  accountId: string,
  agentName: string,
  baseClient?: { getClient(): unknown; getAccountAndSigner(): { accountId: string; signer: unknown } }
): Promise<void> {
  try {
    const mirrorNode = new HederaMirrorNode(network as NetworkType, logger);
    const account = await mirrorNode.requestAccount(accountId);
    const balance = account.balance.balance;
    const hbarBalance = balance / 100_000_000;

    logger.info(`${agentName} account ${accountId} has ${hbarBalance} HBAR`);

    try {
      const hbarPrice = await mirrorNode.getHBARPrice(new Date());

      if (hbarPrice) {
        const balanceInUsd = hbarBalance * hbarPrice;
        logger.info(`${agentName} balance in USD: $${balanceInUsd.toFixed(2)}`);

        if (balanceInUsd < MIN_REQUIRED_USD) {
          logger.warn(
            `${agentName} account ${accountId} has less than $${MIN_REQUIRED_USD} (${balanceInUsd.toFixed(
              2
            )}). Attempting to fund.`
          );

          try {
            if (baseClient) {
              const funder = baseClient.getAccountAndSigner();
              const targetHbar = MIN_REQUIRED_HBAR_USD / hbarPrice;
              const amountToTransferHbar = Math.max(0, targetHbar - hbarBalance);

              if (amountToTransferHbar > 0) {
                const transferTx = new TransferTransaction()
                  .addHbarTransfer(
                    funder.accountId,
                    Hbar.fromTinybars(
                      Math.round(amountToTransferHbar * -100_000_000)
                    )
                  )
                  .addHbarTransfer(
                    accountId,
                    Hbar.fromTinybars(
                      Math.round(amountToTransferHbar * 100_000_000)
                    )
                  );

                logger.info(
                  `Funding ${agentName} account ${accountId} with ${amountToTransferHbar.toFixed(
                    2
                  )} HBAR from ${funder.accountId}`
                );

                const client = baseClient.getClient();
                const fundTxResponse = await transferTx.execute(
                  client as import('@hashgraph/sdk').Client
                );
                await fundTxResponse.getReceipt(client as import('@hashgraph/sdk').Client);
                logger.info(
                  `Successfully funded ${agentName} account ${accountId}.`
                );
              } else {
                logger.info(
                  `${agentName} account ${accountId} does not require additional funding.`
                );
              }
            } else {
              logger.warn(
                `Cannot automatically fund ${agentName} account ${accountId} - no base client provided`
              );
            }
          } catch (fundingError) {
            logger.error(
              `Failed to automatically fund ${agentName} account ${accountId}:`,
              fundingError
            );
            logger.warn(
              `Please fund the account ${accountId} manually with at least ${(
                MIN_REQUIRED_HBAR_USD / hbarPrice
              ).toFixed(2)} HBAR.`
            );
          }
        }
      } else {
        logger.warn(
          'Failed to get HBAR price from Mirror Node. Please ensure the account has enough HBAR.'
        );
      }
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      logger.warn(
        `Failed to check USD balance. Please ensure the account has enough HBAR. ${errorMessage}`
      );
    }
  } catch (error) {
    logger.error(`Failed to check ${agentName} account balance:`, error);
  }
}
