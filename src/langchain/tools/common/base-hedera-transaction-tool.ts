import { z } from 'zod';
import { StructuredTool, ToolParams } from '@langchain/core/tools';
import { HederaAgentKit } from '../../../agent';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { AccountId, Key, TransactionId } from '@hashgraph/sdk';
import { parseKey } from '../../../utils/key-utils';

/**
 * Zod schema for transaction meta options that can be used with any Hedera transaction tool.
 */
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

/**
 * Parameters required to initialize a BaseHederaTransactionTool.
 */
export interface BaseHederaTransactionToolParams extends ToolParams {
  hederaKit: HederaAgentKit;
  logger?: StandardsSdkLogger;
}

/**
 * Schedule options used when executing transactions.
 */
interface ScheduleExecutionOptions {
  schedule?: boolean;
  scheduleMemo?: string;
  schedulePayerAccountId?: string | AccountId;
  scheduleAdminKey?: Key;
}

/**
 * Base class for all Hedera transaction tools.
 * Handles common transaction processing logic across different tool types.
 *
 * @template S - The Zod schema that defines the input parameters for the specific tool
 */
export abstract class BaseHederaTransactionTool<
  //@ts-ignore: Ignoring complex type compatibility issues
  S extends z.ZodObject<any, any, any, any>
> extends StructuredTool<
  //@ts-ignore: Ignoring complex type compatibility issues
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

  //@ts-ignore: Ignoring complex type compatibility issues
  get schema(): this['lc_kwargs']['schema'] {
    //@ts-ignore: Ignoring complex type compatibility issues
    return this.specificInputSchema.extend({
      metaOptions: HederaTransactionMetaOptionsSchema,
    });
  }

  constructor({ hederaKit, logger, ...rest }: BaseHederaTransactionToolParams) {
    super(rest);
    this.hederaKit = hederaKit;
    this.logger = logger || hederaKit.logger;
  }

  /**
   * Get the appropriate service builder for this tool's operations.
   */
  protected abstract getServiceBuilder(): BaseServiceBuilder;

  /**
   * Call the appropriate builder method with the tool-specific arguments.
   */
  protected abstract callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<S>,
    runManager?: CallbackManagerForToolRun
  ): Promise<void>;

  /**
   * Apply any meta options specified in the tool call to the service builder.
   */
  protected async _applyMetaOptions(
    builder: BaseServiceBuilder,
    args: z.infer<S> & { metaOptions?: HederaTransactionMetaOptions },
    specificCallArgs: z.infer<S>
  ): Promise<void> {
    await this._substituteKeyFields(specificCallArgs);
    this._applyTransactionOptions(builder, args.metaOptions);
  }

  /**
   * Handle substitution of special key field values like 'current_signer'
   */
  private async _substituteKeyFields(
    specificCallArgs: z.infer<S>
  ): Promise<void> {
    const keyFieldNames: (keyof typeof specificCallArgs)[] = [
      'adminKey',
      'kycKey',
      'freezeKey',
      'wipeKey',
      'supplyKey',
      'feeScheduleKey',
      'pauseKey',
    ];

    for (const keyField of keyFieldNames) {
      const originalKeyValue = (specificCallArgs as any)[keyField];

      if (originalKeyValue === 'current_signer') {
        try {
          const operatorPubKey = await this.hederaKit.signer.getPublicKey();
          const pubKeyString = operatorPubKey.toStringDer();
          (specificCallArgs as any)[keyField] = pubKeyString;
          this.logger.info(
            `Substituted ${
              keyField as string
            } with current signer's public key.`
          );
        } catch (error) {
          const typedError = error as Error;
          this.logger.error(
            `Failed to get current signer's public key for ${
              keyField as string
            } substitution: ${typedError.message}`,
            error
          );
        }
      }
    }
  }

  /**
   * Apply transaction-specific options from metaOptions
   */
  private _applyTransactionOptions(
    builder: BaseServiceBuilder,
    metaOptions?: HederaTransactionMetaOptions
  ): void {
    if (!metaOptions) return;

    if (metaOptions.transactionId) {
      try {
        builder.setTransactionId(
          TransactionId.fromString(metaOptions.transactionId)
        );
      } catch {
        this.logger.warn(
          `Invalid transactionId format in metaOptions: ${metaOptions.transactionId}, ignoring.`
        );
      }
    }

    if (metaOptions.nodeAccountIds && metaOptions.nodeAccountIds.length > 0) {
      try {
        builder.setNodeAccountIds(
          metaOptions.nodeAccountIds.map((id: string) =>
            AccountId.fromString(id)
          )
        );
      } catch {
        this.logger.warn(
          `Invalid nodeAccountId format in metaOptions, ignoring.`
        );
      }
    }

    if (metaOptions.transactionMemo) {
      builder.setTransactionMemo(metaOptions.transactionMemo);
    }
  }

  /**
   * Handle direct execution mode for the transaction
   */
  private async _handleDirectExecution(
    builder: BaseServiceBuilder,
    args: z.infer<S> & { metaOptions?: HederaTransactionMetaOptions }
  ): Promise<string> {
    const execOptions = this._buildScheduleOptions(args.metaOptions);

    this.logger.info(
      `Executing transaction directly (mode: directExecution): ${this.name}`
    );

    const result = await builder.execute(execOptions);
    return JSON.stringify(result);
  }

  /**
   * Handle providing transaction bytes mode
   */
  private async _handleProvideBytes(
    builder: BaseServiceBuilder,
    args: z.infer<S> & { metaOptions?: HederaTransactionMetaOptions }
  ): Promise<string> {
    const shouldSchedule = this._shouldScheduleTransaction(args.metaOptions);

    if (shouldSchedule) {
      return this._handleScheduledTransaction(builder, args);
    } else {
      return this._handleUnscheduledTransaction(builder);
    }
  }

  /**
   * Determine if a transaction should be scheduled
   */
  private _shouldScheduleTransaction(
    metaOptions?: HederaTransactionMetaOptions
  ): boolean {
    return (
      !this.neverScheduleThisTool &&
      (metaOptions?.schedule ??
        (this.hederaKit.operationalMode === 'provideBytes' &&
          this.hederaKit.scheduleUserTransactionsInBytesMode))
    );
  }

  /**
   * Handle creating a scheduled transaction
   */
  private async _handleScheduledTransaction(
    builder: BaseServiceBuilder,
    args: z.infer<S> & { metaOptions?: HederaTransactionMetaOptions }
  ): Promise<string> {
    this.logger.info(
      `Preparing scheduled transaction (mode: provideBytes, schedule: true): ${this.name}`
    );

    const execOptions = this._buildScheduleOptions(args.metaOptions, true);
    execOptions.schedulePayerAccountId = this.hederaKit.signer.getAccountId();

    const scheduleCreateResult = await builder.execute(execOptions);

    if (scheduleCreateResult.success && scheduleCreateResult.scheduleId) {
      const description =
        args.metaOptions?.transactionMemo ||
        `Scheduled ${this.name} operation.`;

      const userInfo = this.hederaKit.userAccountId
        ? ` User (${this.hederaKit.userAccountId}) will be payer of scheduled transaction.`
        : '';

      return JSON.stringify({
        success: true,
        op: 'schedule_create',
        schedule_id: scheduleCreateResult.scheduleId.toString(),
        description: description + userInfo,
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
  }

  /**
   * Handle returning transaction bytes for an unscheduled transaction
   */
  private async _handleUnscheduledTransaction(
    builder: BaseServiceBuilder
  ): Promise<string> {
    this.logger.info(
      `Returning transaction bytes (mode: provideBytes, schedule: false): ${this.name}`
    );

    const bytes = await builder.getTransactionBytes({});
    return JSON.stringify({
      success: true,
      transactionBytes: bytes,
      transactionId: builder.getCurrentTransaction()?.transactionId?.toString(),
    });
  }

  /**
   * Build schedule options from meta options
   */
  private _buildScheduleOptions(
    metaOptions?: HederaTransactionMetaOptions,
    forceSchedule = false
  ): ScheduleExecutionOptions {
    const options: ScheduleExecutionOptions = {};

    if (forceSchedule || metaOptions?.schedule) {
      options.schedule = true;

      if (metaOptions?.scheduleMemo) {
        options.scheduleMemo = metaOptions.scheduleMemo;
      }

      if (metaOptions?.schedulePayerAccountId) {
        try {
          options.schedulePayerAccountId = AccountId.fromString(
            metaOptions.schedulePayerAccountId
          );
        } catch {
          this.logger.warn('Invalid schedulePayerAccountId');
        }
      }

      if (metaOptions?.scheduleAdminKey) {
        try {
          const parsedKey = parseKey(metaOptions.scheduleAdminKey);
          if (parsedKey) options.scheduleAdminKey = parsedKey;
        } catch {
          this.logger.warn('Invalid scheduleAdminKey');
        }
      }
    }

    return options;
  }

  /**
   * Main method called when the tool is executed.
   * Processes arguments, calls the specific builder method, and handles
   * transaction execution based on the kit's operational mode.
   */
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
      const specificCallArgs = this._extractSpecificArgs(args);

      await this._applyMetaOptions(builder, args, specificCallArgs);
      await this.callBuilderMethod(builder, specificCallArgs, runManager);

      if (this.hederaKit.operationalMode === 'directExecution') {
        return this._handleDirectExecution(builder, args);
      } else {
        return this._handleProvideBytes(builder, args);
      }
    } catch (error) {
      return this._handleError(error);
    }
  }

  /**
   * Extract tool-specific arguments (without metaOptions)
   */
  private _extractSpecificArgs(
    args: z.infer<S> & { metaOptions?: HederaTransactionMetaOptions }
  ): z.infer<S> {
    const specificCallArgs = { ...args };
    if ('metaOptions' in specificCallArgs) {
      delete (specificCallArgs as any).metaOptions;
    }
    return specificCallArgs as z.infer<S>;
  }

  /**
   * Handle errors in a consistent format
   */
  private _handleError(error: unknown): string {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);

    this.logger.error(`Error in ${this.name}: ${errorMessage}`, error);
    return JSON.stringify({ success: false, error: errorMessage });
  }
}
