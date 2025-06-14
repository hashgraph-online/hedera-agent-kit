import { GenericPluginContext, HederaTool } from '../PluginInterface';
import { IStateManager } from '../../state/state-types';
import { OpenConvaiState } from '../../state/open-convai-state';
import { BasePlugin } from '../BasePlugin';
import { HederaAgentKit } from '../../agent/agent';
import { RegisterAgentTool } from '../../langchain/tools/hcs10/RegisterAgentTool';
import { FindRegistrationsTool } from '../../langchain/tools/hcs10/FindRegistrationsTool';
import { InitiateConnectionTool } from '../../langchain/tools/hcs10/InitiateConnectionTool';
import { ListConnectionsTool } from '../../langchain/tools/hcs10/ListConnectionsTool';
import { SendMessageToConnectionTool } from '../../langchain/tools/hcs10/SendMessageToConnectionTool';
import { CheckMessagesTool } from '../../langchain/tools/hcs10/CheckMessagesTool';
import { ConnectionMonitorTool } from '../../langchain/tools/hcs10/ConnectionMonitorTool';
import { ManageConnectionRequestsTool } from '../../langchain/tools/hcs10/ManageConnectionRequestsTool';
import { AcceptConnectionRequestTool } from '../../langchain/tools/hcs10/AcceptConnectionRequestTool';
import { RetrieveProfileTool } from '../../langchain/tools/hcs10/RetrieveProfileTool';
import { ListUnapprovedConnectionRequestsTool } from '../../langchain/tools/hcs10/ListUnapprovedConnectionRequestsTool';

/**
 *  * OpenConvAI Plugin that provides all the tools from standards-agent-kit
 * This plugin enables full HCS-10 agent functionality including registration,
 * connection management, and messaging capabilities.
 */
export class OpenConvAIPlugin extends BasePlugin {
  id = 'openconvai-standards-agent-kit';
  name = 'OpenConvAI Standards Agent Kit Plugin';
  description =
    'Comprehensive plugin providing all HCS-10 agent tools for registration, connections, and messaging';
  version = '1.0.0';
  author = 'Hashgraph Online';
  namespace = 'openconvai';

  private stateManager?: IStateManager;
  private tools: HederaTool[] = [];
  private accountId?: string | undefined;
  private privateKey?: string | undefined;

  constructor(accountId?: string, privateKey?: string) {
    super();
    this.accountId = accountId;
    this.privateKey = privateKey;
  }

  override async initialize(context: GenericPluginContext): Promise<void> {
    await super.initialize(context);

    const accountId = this.accountId || process.env.HEDERA_ACCOUNT_ID;
    const privateKey = this.privateKey || process.env.HEDERA_PRIVATE_KEY;

    if (!accountId || !privateKey) {
      this.context.logger.warn(
        'Account ID and private key not provided. OpenConvAI tools will not be available.'
      );
      return;
    }

    try {
      this.stateManager =
        (context.stateManager as IStateManager) || new OpenConvaiState();

      this.initializeTools();

      this.context.logger.info(
        'OpenConvAI Standards Agent Kit Plugin initialized successfully'
      );
    } catch (error) {
      this.context.logger.error(
        'Failed to initialize OpenConvAI plugin:',
        error
      );
    }
  }

  private initializeTools(): void {
    if (!this.stateManager) {
      throw new Error('StateManager must be initialized before creating tools');
    }

    const hederaKit = this.context.config.hederaKit as HederaAgentKit;
    if (!hederaKit) {
      throw new Error('HederaKit not found in context config');
    }

    this.tools = [
      new RegisterAgentTool({
        hederaKit: hederaKit,
      }),
      new FindRegistrationsTool({
        hederaKit: hederaKit,
      }),
      new RetrieveProfileTool({
        hederaKit: hederaKit,
      }),
      new InitiateConnectionTool({
        hederaKit: hederaKit,
      }),
      new ListConnectionsTool({
        hederaKit: hederaKit,
      }),
      new SendMessageToConnectionTool({
        hederaKit: hederaKit,
      }),
      new CheckMessagesTool({
        hederaKit: hederaKit,
      }),
      new ConnectionMonitorTool({
        hederaKit: hederaKit,
      }),
      new ManageConnectionRequestsTool({
        hederaKit: hederaKit,
      }),
      new AcceptConnectionRequestTool({
        hederaKit: hederaKit,
      }),
      new ListUnapprovedConnectionRequestsTool({
        hederaKit: hederaKit,
      }),
    ];
  }

  getTools(): HederaTool[] {
    return this.tools;
  }

  getStateManager(): IStateManager | undefined {
    return this.stateManager;
  }

  override async cleanup(): Promise<void> {
    this.tools = [];
    delete this.stateManager;
    if (this.context?.logger) {
      this.context.logger.info(
        'OpenConvAI Standards Agent Kit Plugin cleaned up'
      );
    }
  }
}
