import {
  HCS10Client,
  AgentBuilder,
  InboundTopicType,
  Logger,
  AIAgentCapability,
  HederaMirrorNode,
  RegistrationProgressData,
  AgentCreationState,
  MCPServerBuilder,
} from '@hashgraphonline/standards-sdk';
import { TransferTransaction, Hbar } from '@hashgraph/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

export const MIN_REQUIRED_USD = 2.0;
export const MIN_REQUIRED_HBAR_USD = 30.0;

export const ENV_FILE_PATH = path.join(process.cwd(), '.env');

export interface AgentData {
  accountId: string;
  inboundTopicId: string;
  outboundTopicId: string;
  client: HCS10Client;
}

export interface CreateAgentResult {
  client: HCS10Client;
  accountId: string;
  inboundTopicId: string;
  outboundTopicId: string;
}

export async function ensureAgentHasEnoughHbar(
  logger: Logger,
  baseClient: HCS10Client,
  accountId: string,
  agentName: string
): Promise<void> {
  try {
    const account = await baseClient.requestAccount(accountId);
    const balance = account.balance.balance;
    const hbarBalance = balance / 100_000_000;

    logger.info(`${agentName} account ${accountId} has ${hbarBalance} HBAR`);

    try {
      const mirrorNode = new HederaMirrorNode('testnet', logger);
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

              const fundTxResponse = await transferTx.execute(
                baseClient.getClient()
              );
              await fundTxResponse.getReceipt(baseClient.getClient());
              logger.info(
                `Successfully funded ${agentName} account ${accountId}.`
              );
            } else {
              logger.info(
                `${agentName} account ${accountId} does not require additional funding.`
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
    } catch {
      logger.warn(
        'Failed to check USD balance. Please ensure the account has enough HBAR.'
      );
    }
  } catch (error) {
    logger.error(`Failed to check ${agentName} account balance:`, error);
  }
}

export async function getAgentFromEnv(
  logger: Logger,
  baseClient: HCS10Client,
  agentName: string,
  envPrefix: string
): Promise<AgentData | null> {
  const accountIdEnvVar = `${envPrefix}_ACCOUNT_ID`;
  const privateKeyEnvVar = `${envPrefix}_PRIVATE_KEY`;
  const inboundTopicIdEnvVar = `${envPrefix}_INBOUND_TOPIC_ID`;
  const outboundTopicIdEnvVar = `${envPrefix}_OUTBOUND_TOPIC_ID`;
  const profileTopicIdEnvVar = `${envPrefix}_PROFILE_TOPIC_ID`;

  const accountId = process.env[accountIdEnvVar];
  const privateKey = process.env[privateKeyEnvVar];
  const inboundTopicId = process.env[inboundTopicIdEnvVar];
  const outboundTopicId = process.env[outboundTopicIdEnvVar];
  const profileTopicId = process.env[profileTopicIdEnvVar];

  if (
    !accountId ||
    !privateKey ||
    !inboundTopicId ||
    !outboundTopicId ||
    !profileTopicId
  ) {
    logger.info(`${agentName} agent not found in environment variables`);
    return null;
  }

  logger.info(`${agentName} agent found in environment variables`);
  logger.info(`${agentName} account ID: ${accountId}`);
  logger.info(`${agentName} inbound topic ID: ${inboundTopicId}`);
  logger.info(`${agentName} outbound topic ID: ${outboundTopicId}`);

  const client = new HCS10Client({
    network: 'testnet',
    operatorId: accountId,
    operatorPrivateKey: privateKey,
    guardedRegistryBaseUrl: process.env.REGISTRY_URL,
    prettyPrint: true,
    logLevel: 'debug',
  });

  await ensureAgentHasEnoughHbar(logger, baseClient, accountId, agentName);

  return {
    accountId,
    inboundTopicId,
    outboundTopicId,
    client,
  };
}

export async function createAgent(
  logger: Logger,
  baseClient: HCS10Client,
  agentName: string,
  agentBuilder: AgentBuilder | MCPServerBuilder,
  envPrefix: string,
  options: { initialBalance?: number } = {}
): Promise<AgentData | null> {
  try {
    logger.info(`Creating ${agentName} agent...`);

    const existingState: Partial<AgentCreationState> = {};

    const pfpTopicId = process.env[`${envPrefix}_PFP_TOPIC_ID`];
    const inboundTopicId = process.env[`${envPrefix}_INBOUND_TOPIC_ID`];
    const outboundTopicId = process.env[`${envPrefix}_OUTBOUND_TOPIC_ID`];
    const profileTopicId = process.env[`${envPrefix}_PROFILE_TOPIC_ID`];
    const accountId = process.env[`${envPrefix}_ACCOUNT_ID`];
    const privateKey = process.env[`${envPrefix}_PRIVATE_KEY`];

    if (pfpTopicId) {
      existingState.pfpTopicId = pfpTopicId;
    }
    if (inboundTopicId) {
      existingState.inboundTopicId = inboundTopicId;
    }
    if (outboundTopicId) {
      existingState.outboundTopicId = outboundTopicId;
    }
    if (profileTopicId) {
      existingState.profileTopicId = profileTopicId;
    }

    if (profileTopicId && inboundTopicId && outboundTopicId) {
      existingState.currentStage = 'registration';
      existingState.completedPercentage = 80;
    } else if (inboundTopicId && outboundTopicId) {
      existingState.currentStage = 'profile';
      existingState.completedPercentage = 60;
    } else if (pfpTopicId) {
      existingState.currentStage = 'topics';
      existingState.completedPercentage = 40;
    } else if (accountId && privateKey) {
      existingState.currentStage = 'pfp';
      existingState.completedPercentage = 20;
    } else {
      existingState.currentStage = 'init';
      existingState.completedPercentage = 0;
    }

    existingState.createdResources = [];
    if (accountId) {
      existingState.createdResources.push(`account:${accountId}`);
    }
    if (pfpTopicId) {
      existingState.createdResources.push(`pfp:${pfpTopicId}`);
    }
    if (inboundTopicId) {
      existingState.createdResources.push(`inbound:${inboundTopicId}`);
    }
    if (outboundTopicId) {
      existingState.createdResources.push(`outbound:${outboundTopicId}`);
    }
    if (profileTopicId) {
      existingState.createdResources.push(`profile:${profileTopicId}`);
    }

    const hasPartialState = Object.keys(existingState).length > 2;

    if (hasPartialState) {
      logger.info(`Found partial state for ${agentName}:`);
      logger.info(
        `  Stage: ${existingState.currentStage} (${existingState.completedPercentage}%)`
      );
      logger.info(`  Resources: ${existingState.createdResources?.join(', ')}`);

      if (accountId && privateKey) {
        agentBuilder.setExistingAccount(accountId, privateKey);
      }
    }

    const method =
      agentBuilder instanceof AgentBuilder
        ? 'createAndRegisterAgent'
        : 'createAndRegisterMCPServer';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await baseClient[method](agentBuilder as any, {
      ...options,
      existingState: hasPartialState
        ? (existingState as AgentCreationState)
        : undefined,
      progressCallback: async (data: RegistrationProgressData) => {
        logger.info(`[${data.stage}] ${data.message}`);

        if (data.progressPercent !== undefined) {
          logger.info(`Progress: ${data.progressPercent}%`);
        }

        const envUpdates: Record<string, string> = {};

        if (data.details) {
          if (data.details.account?.accountId) {
            envUpdates[`${envPrefix}_ACCOUNT_ID`] =
              data.details.account.accountId;
            logger.debug(`Account created: ${data.details.account.accountId}`);
          }
          if (data.details.account?.privateKey) {
            envUpdates[`${envPrefix}_PRIVATE_KEY`] =
              data.details.account.privateKey;
          }
          if (data.details.outboundTopicId) {
            envUpdates[`${envPrefix}_OUTBOUND_TOPIC_ID`] =
              data.details.outboundTopicId;
            logger.debug(`Outbound topic: ${data.details.outboundTopicId}`);
          }
          if (data.details.inboundTopicId) {
            envUpdates[`${envPrefix}_INBOUND_TOPIC_ID`] =
              data.details.inboundTopicId;
            logger.debug(`Inbound topic: ${data.details.inboundTopicId}`);
          }
          if (data.details.pfpTopicId) {
            envUpdates[`${envPrefix}_PFP_TOPIC_ID`] = data.details.pfpTopicId;
            logger.debug(`Profile picture topic: ${data.details.pfpTopicId}`);
          }
          if (data.details.profileTopicId) {
            envUpdates[`${envPrefix}_PROFILE_TOPIC_ID`] =
              data.details.profileTopicId;
            logger.debug(`Profile topic: ${data.details.profileTopicId}`);
          }
          if (data.details.operatorId) {
            envUpdates[`${envPrefix}_OPERATOR_ID`] = data.details.operatorId;
            logger.debug(`Operator ID: ${data.details.operatorId}`);
          }

          if (data.details.state) {
            if (data.details.state.currentStage) {
              envUpdates[`${envPrefix}_CREATION_STAGE`] =
                data.details.state.currentStage;
            } else {
              envUpdates[`${envPrefix}_CREATION_STAGE`] = '';
            }

            let progressPercent: number;
            if (
              data.details.state.completedPercentage !== undefined &&
              data.details.state.completedPercentage !== null
            ) {
              progressPercent = data.details.state.completedPercentage;
            } else {
              progressPercent = 0;
            }
            envUpdates[`${envPrefix}_CREATION_PROGRESS`] =
              progressPercent.toString();
          }
        }

        if (Object.keys(envUpdates).length > 0) {
          await updateEnvFile(ENV_FILE_PATH, envUpdates);
          logger.debug(
            `Updated env file with ${Object.keys(envUpdates).length} new values`
          );
        }
      },
    });

    if (!result.metadata) {
      logger.error(`${agentName} agent creation failed`);
      return null;
    }

    const metadata = result.metadata;

    logger.info(`${agentName} agent created successfully`);
    logger.info(`${agentName} account ID: ${metadata.accountId}`);
    logger.info(`${agentName} private key: ${metadata.privateKey}`);
    logger.info(`${agentName} inbound topic ID: ${metadata.inboundTopicId}`);
    logger.info(`${agentName} outbound topic ID: ${metadata.outboundTopicId}`);

    const client = new HCS10Client({
      network: 'testnet',
      operatorId: metadata.accountId,
      operatorPrivateKey: metadata.privateKey,
      guardedRegistryBaseUrl: process.env.REGISTRY_URL,
      prettyPrint: true,
      logLevel: 'debug',
    });

    return {
      accountId: metadata.accountId,
      inboundTopicId: metadata.inboundTopicId,
      outboundTopicId: metadata.outboundTopicId,
      client,
    };
  } catch (error) {
    logger.error(`Error creating ${agentName} agent:`, error);
    return null;
  }
}

export async function updateEnvFile(
  envFilePath: string,
  variables: Record<string, string>
): Promise<void> {
  let envContent = '';

  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf8');
  }

  const envLines = envContent.split('\n');
  const updatedLines = [...envLines];

  for (const [key, value] of Object.entries(variables)) {
    const lineIndex = updatedLines.findIndex((line) =>
      line.startsWith(`${key}=`)
    );

    if (lineIndex !== -1) {
      updatedLines[lineIndex] = `${key}=${value}`;
    } else {
      updatedLines.push(`${key}=${value}`);
    }
  }

  if (updatedLines[updatedLines.length - 1] !== '') {
    updatedLines.push('');
  }

  fs.writeFileSync(envFilePath, updatedLines.join('\n'));
}

export function createBobBuilder(pfpBuffer?: Buffer): AgentBuilder {
  const bobBuilder = new AgentBuilder()
    .setName('Bob')
    .setAlias('bob')
    .setBio('A language processing agent')
    .setCapabilities([
      AIAgentCapability.TEXT_GENERATION,
      AIAgentCapability.CODE_GENERATION,
      AIAgentCapability.DATA_INTEGRATION,
      AIAgentCapability.KNOWLEDGE_RETRIEVAL,
    ])
    .setType('autonomous')
    .setModel('agent-model-2024')
    .addSocial('x', '@bob')
    .addProperty('name', 'Bob')
    .addProperty('description', 'A language processing agent')
    .addProperty('version', '1.0.0')
    .addProperty('permissions', ['read_network', 'propose_message'])
    .setNetwork('testnet')
    .setInboundTopicType(InboundTopicType.PUBLIC);

  if (pfpBuffer) {
    bobBuilder.setProfilePicture(pfpBuffer, 'bob-icon.svg');
  }

  return bobBuilder;
}

export async function getOrCreateBob(
  logger: Logger,
  baseClient: HCS10Client
): Promise<AgentData | null> {
  const existingBob = await getAgentFromEnv(logger, baseClient, 'Bob', 'BOB');

  if (existingBob) {
    return existingBob;
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const bobPfpPath = path.join(__dirname, 'assets', 'bob-icon.svg');
  let pfpBuffer: Buffer | undefined;
  if (fs.existsSync(bobPfpPath)) {
    pfpBuffer = fs.readFileSync(bobPfpPath);
  } else {
    pfpBuffer = undefined;
  }

  const enableImageCreation = process.env.ENABLE_DEMO_PFP === 'true';
  let pfpForBuilder: Buffer | undefined;
  if (enableImageCreation) {
    pfpForBuilder = pfpBuffer;
  } else {
    pfpForBuilder = undefined;
  }
  const bobBuilder = createBobBuilder(pfpForBuilder);

  return await createAgent(logger, baseClient, 'Bob', bobBuilder, 'BOB');
}

export async function getOrCreateAlice(
  logger: Logger,
  baseClient: HCS10Client
): Promise<AgentData | null> {
  const existingAlice = await getAgentFromEnv(
    logger,
    baseClient,
    'Alice',
    'ALICE'
  );

  if (existingAlice) {
    return existingAlice;
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const alicePfpPath = path.join(__dirname, 'assets', 'alice-icon.svg');
  let pfpBuffer: Buffer | undefined;
  if (fs.existsSync(alicePfpPath)) {
    pfpBuffer = fs.readFileSync(alicePfpPath);
  } else {
    pfpBuffer = undefined;
  }

  if (!pfpBuffer) {
    logger.warn('Alice profile picture not found, using default');
  }

  const aliceBuilder = new AgentBuilder()
    .setName('Alice')
    .setBio('A helpful AI assistant for data analysis')
    .setCapabilities([
      AIAgentCapability.TEXT_GENERATION,
      AIAgentCapability.KNOWLEDGE_RETRIEVAL,
    ])
    .setType('manual')
    .setModel('agent-model-2024')
    .addSocial('x', '@alice')
    .addProperty('name', 'Alice')
    .addProperty('description', 'A helpful AI assistant for data analysis')
    .addProperty('version', '1.0.0')
    .addProperty('permissions', ['read_network', 'propose_message'])
    .setNetwork('testnet')
    .setInboundTopicType(InboundTopicType.PUBLIC);

  const enableImageCreation = process.env.ENABLE_DEMO_PFP === 'true';
  if (pfpBuffer && enableImageCreation) {
    aliceBuilder.setProfilePicture(pfpBuffer, 'alice-icon.svg');
  }

  return await createAgent(logger, baseClient, 'Alice', aliceBuilder, 'ALICE');
}
