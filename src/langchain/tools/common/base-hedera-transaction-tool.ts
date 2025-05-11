import { z } from 'zod';
import { StructuredTool, ToolParams } from '@langchain/core/tools';
import { HederaAgentKit } from '../../../agent';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountId, Key, TransactionId } from '@hashgraph/sdk';
import { parseKey } from '../../../utils/key-utils';

export const HederaTransactionMetaOptionsSchema = z
  .object({
    transactionMemo: z
      .string()
      .optional()
      .describe('Optional memo for the Hedera transaction.'),
    transactionId: z
      .string()
      .optional()
      .describe(
        'Optional transaction ID to use (e.g., for pre-generated IDs).'
      ),
    nodeAccountIds: z
      .array(z.string())
      .optional()
      .describe(
        'Optional specific node account IDs to target for the transaction.'
      ),
    schedule: z
      .boolean()
      .optional()
      .describe(
        'Set to true to schedule the transaction. If true, output will be for a ScheduleCreate transaction.'
      ),

    scheduleMemo: z
      .string()
      .optional()
      .describe('Optional memo for the ScheduleCreate transaction itself.'),
    schedulePayerAccountId: z
      .string()
      .optional()
      .describe(
        'Optional payer account ID for the ScheduleCreate transaction.'
      ),
    scheduleAdminKey: z
      .string()
      .optional()
      .describe(
        'Optional admin key (serialized string) for the ScheduleCreate transaction. Builder parses.'
      ),
  })
  .optional();

export type HederaTransactionMetaOptions = z.infer<
  typeof HederaTransactionMetaOptionsSchema
>;

export interface BaseHederaTransactionToolParams extends ToolParams {
  hederaKit: HederaAgentKit;
  logger?: StandardsSdkLogger;
}

export abstract class BaseHederaTransactionTool<
  //@ts-ignore
  S extends z.ZodObject<any, any, any, any, any>
> extends StructuredTool<
  //@ts-ignore
  z.ZodObject<
    S['shape'] & { metaOptions: typeof HederaTransactionMetaOptionsSchema },
    any,
    any,
    z.infer<S> & { metaOptions?: HederaTransactionMetaOptions },
    z.infer<S> & { metaOptions?: HederaTransactionMetaOptions }
  >
> {
  protected hederaKit: HederaAgentKit;
  protected logger: StandardsSdkLogger;
  protected neverScheduleThisTool: boolean = false;

  abstract specificInputSchema: S;

  //@ts-ignore
  get schema(): this['lc_kwargs']['schema'] {
    //@ts-ignore
    return this.specificInputSchema.extend({
      metaOptions: HederaTransactionMetaOptionsSchema,
    });
  }

  constructor({ hederaKit, logger, ...rest }: BaseHederaTransactionToolParams) {
    super(rest);
    this.hederaKit = hederaKit;
    this.logger = logger || hederaKit.logger;
  }

  protected abstract getServiceBuilder(): BaseServiceBuilder;

  protected abstract callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<S>,
    runManager?: CallbackManagerForToolRun
  ): Promise<void>;

  protected async _applyMetaOptions(
    builder: BaseServiceBuilder,
    args: z.infer<S> & { metaOptions?: HederaTransactionMetaOptions },
    specificCallArgs: z.infer<S>
  ): Promise<void> {
    const keyFieldsToPotentiallySubstitute: (keyof typeof specificCallArgs)[] = [
      'adminKey',
      'kycKey',
      'freezeKey',
      'wipeKey',
      'supplyKey',
      'feeScheduleKey',
      'pauseKey',
    ];

    for (const keyField of keyFieldsToPotentiallySubstitute) {
      const originalKeyValue = (specificCallArgs as any)[keyField];

      if (originalKeyValue === 'current_signer') {
        try {
          const operatorPubKey = await this.hederaKit.signer.getPublicKey();
          const pubKeyString = operatorPubKey.toStringDer();
          (specificCallArgs as any)[keyField] = pubKeyString;
          this.logger.info(
            `Substituted ${keyField as string} with current signer's public key.`
          );
        } catch (e: unknown) {
          const error = e as Error;
          this.logger.error(
            `Failed to get current signer's public key for ${keyField as string} substitution: ${error.message}`,
            error
          );
        }
      }
    }

    if (args.metaOptions?.transactionId) {
      try {
        builder.setTransactionId(
          TransactionId.fromString(args.metaOptions.transactionId)
        );
      } catch {
        this.logger.warn(
          `Invalid transactionId format in metaOptions: ${args.metaOptions.transactionId}, ignoring.`
        );
      }
    }

    if (args.metaOptions?.nodeAccountIds?.length > 0) {
      try {
        builder.setNodeAccountIds(
          args.metaOptions.nodeAccountIds.map((id: string) =>
            AccountId.fromString(id)
          )
        );
      } catch {
        this.logger.warn(
          `Invalid nodeAccountId format in metaOptions, ignoring.`
        );
      }
    }

    if (args.metaOptions?.transactionMemo) {
      builder.setTransactionMemo(args.metaOptions.transactionMemo);
    }
  }

  private async _handleDirectExecution(
    builder: BaseServiceBuilder,
    args: z.infer<S> & { metaOptions?: HederaTransactionMetaOptions }
  ): Promise<string> {
    const execOptions: {
      schedule?: boolean;
      scheduleMemo?: string;
      schedulePayerAccountId?: string | AccountId;
      scheduleAdminKey?: Key;
    } = {};

    execOptions.schedule = args.metaOptions?.schedule;
    if (execOptions.schedule) {
      if (args?.metaOptions?.scheduleMemo) {
        execOptions.scheduleMemo = args.metaOptions.scheduleMemo;
      }
      if (args?.metaOptions?.schedulePayerAccountId) {
        try {
          execOptions.schedulePayerAccountId = AccountId.fromString(
            args.metaOptions.schedulePayerAccountId
          );
        } catch {
          this.logger.warn('Invalid schedulePayerAccountId');
        }
      }
      if (args?.metaOptions?.scheduleAdminKey) {
        try {
          const parsedKey = parseKey(args.metaOptions.scheduleAdminKey);
          if (parsedKey) execOptions.scheduleAdminKey = parsedKey;
        } catch {
          this.logger.warn('Invalid scheduleAdminKey');
        }
      }
    }
    this.logger.info(
      `Executing transaction directly (mode: directExecution): ${this.name}`
    );
    const result = await builder.execute(execOptions);
    return JSON.stringify(result);
  }

  private async _handleProvideBytes(
    builder: BaseServiceBuilder,
    args: z.infer<S> & { metaOptions?: HederaTransactionMetaOptions }
  ): Promise<string> {
    const execOptions: {
      schedule?: boolean;
      scheduleMemo?: string;
      schedulePayerAccountId?: string | AccountId;
      scheduleAdminKey?: Key;
    } = {};

    const shouldSchedule =
      !this.neverScheduleThisTool &&
      (args.metaOptions?.schedule ??
        (this.hederaKit.operationalMode === 'provideBytes' &&
          this.hederaKit.scheduleUserTransactionsInBytesMode));

    if (shouldSchedule) {
      this.logger.info(
        `Preparing scheduled transaction (mode: provideBytes, schedule: true): ${this.name}`
      );
      execOptions.schedule = true;
      if (args?.metaOptions?.scheduleMemo) {
        execOptions.scheduleMemo = args.metaOptions.scheduleMemo;
      }
      execOptions.schedulePayerAccountId =
        this.hederaKit.signer.getAccountId();
      if (args?.metaOptions?.scheduleAdminKey) {
        try {
          const parsedKey = parseKey(
            args.metaOptions.scheduleAdminKey as string
          );
          if (parsedKey) execOptions.scheduleAdminKey = parsedKey;
        } catch (e: unknown) {
          this.logger.warn(
            `Invalid scheduleAdminKey in metaOptions: ${
              (e as Error).message
            }`
          );
        }
      }

      const scheduleCreateResult = await builder.execute(execOptions);

      if (scheduleCreateResult.success && scheduleCreateResult.scheduleId) {
        const description =
          args.metaOptions?.transactionMemo ||
          `Scheduled ${this.name} operation.`;
        return JSON.stringify({
          success: true,
          op: 'schedule_create',
          schedule_id: scheduleCreateResult.scheduleId.toString(),
          description:
            description +
            (this.hederaKit.userAccountId
              ? ` User (${this.hederaKit.userAccountId}) will be payer of scheduled transaction.`
              : ''),
          payer_account_id_scheduled_tx:
            this.hederaKit.userAccountId || 'unknown',
          memo_scheduled_tx: args.metaOptions?.transactionMemo,
        });
      } else {
        return JSON.stringify({
          success: false,
          error:
            scheduleCreateResult.error ||
            'Failed to create schedule and retrieve ID.',
        });
      }
    } else {
      this.logger.info(
        `Returning transaction bytes (mode: provideBytes, schedule: false): ${this.name}`
      );
      const bytes = await builder.getTransactionBytes({});
      return JSON.stringify({
        success: true,
        transactionBytes: bytes,
        transactionId: builder
          .getCurrentTransaction()
          ?.transactionId?.toString(),
      });
    }
  }

  protected async _call(
    args: z.infer<S> & { metaOptions?: HederaTransactionMetaOptions },
    runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    this.logger.info(
      `Executing ${this.name} with specific args:`,
      args as z.infer<S>,
      'and metaOptions:',
      args.metaOptions
    );

    try {
      const builder = this.getServiceBuilder();
      const specificCallArgs = { ...args };
      if ('metaOptions' in specificCallArgs) {
        delete (specificCallArgs as any).metaOptions;
      }

      await this._applyMetaOptions(builder, args, specificCallArgs as z.infer<S>);

      await this.callBuilderMethod(
        builder,
        specificCallArgs as z.infer<S>,
        runManager
      );

      if (this.hederaKit.operationalMode === 'directExecution') {
        return this._handleDirectExecution(builder, args);
      } else {
        return this._handleProvideBytes(builder, args);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Error in ${this.name}: ${errorMessage}`, error);
      return JSON.stringify({ success: false, error: errorMessage });
    }
  }
}
