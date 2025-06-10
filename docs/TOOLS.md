# Available Tools

The Hedera Agent Kit provides a comprehensive set of tools organized by service type. These tools can be used both by the conversational agent and programmatically.

## Account Management Tools

| Tool Name                                       | Description                                        | Example Usage                                             |
| ----------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| `hedera-account-create`                         | Creates a new Hedera account                       | Create an account with initial balance and key            |
| `hedera-account-update`                         | Updates properties of an existing account          | Change account memo, auto-renew period, etc.              |
| `hedera-account-delete`                         | Deletes an account and transfers remaining balance | Delete an account and transfer funds to another account   |
| `hedera-transfer-hbar`                          | Transfers HBAR between accounts                    | Send HBAR from one account to another                     |
| `hedera-approve-hbar-allowance`                 | Approves an HBAR allowance for a spender account   | Grant permission for another account to spend your HBAR   |
| `hedera-approve-fungible-token-allowance`       | Approves a fungible token allowance                | Grant permission for another account to spend your tokens |
| `hedera-approve-token-nft-allowance`            | Approves an NFT allowance                          | Grant permission for another account to spend your NFTs   |
| `hedera-revoke-hbar-allowance`                  | Revokes an HBAR allowance                          | Remove permission for an account to spend your HBAR       |
| `hedera-revoke-fungible-token-allowance`        | Revokes a fungible token allowance                 | Remove permission for an account to spend your tokens     |
| `hedera-sign-and-execute-scheduled-transaction` | Signs and executes a scheduled transaction         | User signs a transaction prepared by the agent            |

## HBAR Transaction Tools

| Tool Name                      | Description                           | Example Usage                                       |
| ------------------------------ | ------------------------------------- | --------------------------------------------------- |
| `hedera-account-transfer-hbar` | Transfers HBAR between accounts       | Send HBAR with memo support and detailed parameters |
| `hedera-account-balance-hbar`  | Retrieves HBAR balance for an account | Check your HBAR balance                             |

## HTS Token Service Tools

| Tool Name                              | Description                                 | Example Usage                                           |
| -------------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `hedera-hts-create-fungible-token`     | Creates a new fungible token                | Create a custom token with name, symbol, decimals, etc. |
| `hedera-hts-create-nft`                | Creates a new NFT collection                | Create an NFT collection with configurable properties   |
| `hedera-hts-mint-fungible-token`       | Mints additional supply of a fungible token | Add more tokens to circulation                          |
| `hedera-hts-mint-nft`                  | Mints a new NFT within a collection         | Create a new NFT with metadata                          |
| `hedera-hts-transfer-tokens`           | Transfers fungible tokens between accounts  | Send tokens from one account to another                 |
| `hedera-hts-transfer-nft`              | Transfers NFT ownership                     | Send an NFT to another account                          |
| `hedera-hts-associate-token`           | Associates a token to an account            | Enable an account to receive a token                    |
| `hedera-hts-dissociate-tokens`         | Removes token associations                  | Remove a token from your account                        |
| `hedera-hts-reject-tokens`             | Rejects automatically associated tokens     | Reject tokens you don't want                            |
| `hedera-hts-burn-fungible-token`       | Burns fungible tokens (reduces supply)      | Remove tokens from circulation                          |
| `hedera-hts-burn-nft`                  | Burns an NFT (destroys it)                  | Destroy an NFT permanently                              |
| `hedera-hts-update-token`              | Updates token properties                    | Modify token name, symbol, or other properties          |
| `hedera-hts-delete-token`              | Deletes a token                             | Remove a token completely                               |
| `hedera-hts-pause-token`               | Pauses a token (prevents transfers)         | Temporarily freeze all transfers of a token             |
| `hedera-hts-unpause-token`             | Unpauses a token                            | Resume transfers for a paused token                     |
| `hedera-hts-freeze-token-account`      | Freezes a token for a specific account      | Prevent an account from transferring a specific token   |
| `hedera-hts-unfreeze-token-account`    | Unfreezes a token for an account            | Allow transfers for a previously frozen account         |
| `hedera-hts-grant-kyc-token`           | Grants KYC for a token to an account        | Approve KYC for an account to use a token               |
| `hedera-hts-revoke-kyc-token`          | Revokes KYC for a token from an account     | Remove KYC approval for an account                      |
| `hedera-hts-wipe-token-account`        | Wipes tokens from an account                | Remove tokens from an account                           |
| `hedera-hts-token-fee-schedule-update` | Updates token fee schedule                  | Modify fees for a token                                 |
| `hedera-airdrop-token`                 | Airdrops tokens to multiple recipients      | Send tokens to many accounts at once                    |
| `hedera-claim-airdrop`                 | Claims an airdrop                           | Claim tokens sent to you                                |

## HCS Consensus Service Tools

| Tool Name                     | Description                    | Example Usage                           |
| ----------------------------- | ------------------------------ | --------------------------------------- |
| `hedera-create-topic`         | Creates a new HCS topic        | Create a topic for message consensus    |
| `hedera-delete-topic`         | Deletes an HCS topic           | Remove a topic you created              |
| `hedera-submit-topic-message` | Submits a message to a topic   | Send a message to be recorded on Hedera |
| `hedera-get-topic-messages`   | Gets messages from a topic     | Retrieve messages from a topic          |
| `hedera-get-topic-info`       | Gets information about a topic | Retrieve topic details                  |

## File Service Tools

| Tool Name            | Description                         | Example Usage                  |
| -------------------- | ----------------------------------- | ------------------------------ |
| `hedera-create-file` | Creates a new file on Hedera        | Store immutable data on Hedera |
| `hedera-append-file` | Appends content to an existing file | Add more data to a file        |
| `hedera-update-file` | Updates a file's contents           | Replace file contents          |
| `hedera-delete-file` | Deletes a file                      | Remove a file                  |

## Smart Contract Service Tools

| Tool Name                 | Description                  | Example Usage                            |
| ------------------------- | ---------------------------- | ---------------------------------------- |
| `hedera-create-contract`  | Deploys a smart contract     | Deploy Solidity contract bytecode        |
| `hedera-update-contract`  | Updates a contract           | Update contract properties               |
| `hedera-delete-contract`  | Deletes a contract           | Remove a deployed contract               |
| `hedera-execute-contract` | Executes a contract function | Call functions on your deployed contract | 