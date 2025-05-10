import { z } from 'zod';
import { StructuredTool, ToolParams } from '@langchain/core/tools';
import { HederaAgentKit } from '../../../agent';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { BaseServiceBuilder } from '../../../builders/base-service-builder'; // Adjusted path
import { AccountId, Key, PrivateKey, TransactionId } from '@hashgraph/sdk';

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
        'Set to true to schedule the transaction instead of immediate execution.'
      ),
    getBytes: z
      .boolean()
      .optional()
      .describe(
        'Set to true to get transaction bytes instead of executing. `schedule` is considered if this is true.'
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
        'Optional admin key (hex-encoded private/serialized public string) for the ScheduleCreate transaction.'
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

// S is the Zod schema for the *specific inputs* of the derived tool (excluding metaOptions)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - To handle Zod schema compatibility issues with ToolInputSchemaBase at this generic level
export abstract class BaseHederaTransactionTool<
  S extends z.ZodObject<any, any, any, any, any>
> extends StructuredTool<
  //@ts-ignore - To handle Zod schema compatibility issues with ToolInputSchemaBase at this generic level
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

  abstract specificInputSchema: S;

  get schema(): this['lc_kwargs']['schema'] {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Property '_any' is missing...
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

      // Handle "current_signer" for adminKey, kycKey, freezeKey, wipeKey, supplyKey, feeScheduleKey, pauseKey
      const keyFieldsToPotentiallySubstitute: (keyof typeof specificCallArgs)[] =
        [
          'adminKey',
          'kycKey',
          'freezeKey',
          'wipeKey',
          'supplyKey',
          'feeScheduleKey',
          'pauseKey',
        ];

      for (const keyField of keyFieldsToPotentiallySubstitute) {
        if ((specificCallArgs as any)[keyField] === 'current_signer') {
          try {
            const operatorPubKey = await this.hederaKit.signer.getPublicKey();
            // Using toStringDer() as it's a common serialized format.
            (specificCallArgs as any)[keyField] = operatorPubKey.toStringDer();
            this.logger.info(
              `Substituted ${
                keyField as string
              } with current signer's public key.`
            );
          } catch (e: any) {
            this.logger.error(
              `Failed to get current signer's public key for ${
                keyField as string
              } substitution: ${e.message}`,
              e
            );
            // Decide on error handling: throw, or let it proceed and potentially fail in the builder
            // For now, we'll let it proceed, and the builder will likely error out if the key is still bad.
          }
        }
      }

      if (args.metaOptions?.transactionId) {
        builder.setTransactionId(
          TransactionId.fromString(args.metaOptions.transactionId)
        );
      }
      if (args?.metaOptions?.nodeAccountIds?.length > 0) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Linter struggles with inferred type of 'id' in map despite explicit annotation
        builder.setNodeAccountIds(
          args.metaOptions.nodeAccountIds.map((id: string) =>
            AccountId.fromString(id)
          )
        );
      }

      await this.callBuilderMethod(
        builder,
        specificCallArgs as z.infer<S>,
        runManager
      );

      if (args?.metaOptions?.transactionMemo) {
        builder.setTransactionMemo(args.metaOptions.transactionMemo);
      }

      const execOptions: {
        schedule?: boolean;
        scheduleMemo?: string;
        schedulePayerAccountId?: string | AccountId;
        scheduleAdminKey?: Key;
      } = {};

      if (args?.metaOptions?.schedule) {
        execOptions.schedule = args.metaOptions.schedule;
      }
      if (args?.metaOptions?.scheduleMemo) {
        execOptions.scheduleMemo = args.metaOptions.scheduleMemo;
      }
      if (args?.metaOptions?.schedulePayerAccountId) {
        execOptions.schedulePayerAccountId =
          args.metaOptions.schedulePayerAccountId;
      }
      if (args?.metaOptions?.scheduleAdminKey) {
        try {
          execOptions.scheduleAdminKey = PrivateKey.fromString(
            args.metaOptions.scheduleAdminKey
          ).publicKey;
        } catch (e) {
          this.logger.warn(
            `Could not parse scheduleAdminKey string: ${args.metaOptions.scheduleAdminKey}. Scheduling without admin key.`
          );
        }
      }

      if (args?.metaOptions?.getBytes) {
        const bytes = await builder.getTransactionBytes(execOptions);
        return JSON.stringify({ success: true, type: 'bytes', output: bytes });
      } else {
        const result = await builder.execute(execOptions);
        return JSON.stringify(result);
      }
    } catch (error: any) {
      this.logger.error(`Error in ${this.name}: ${error.message}`, error);
      return JSON.stringify({ success: false, error: error.message });
    }
  }
}
