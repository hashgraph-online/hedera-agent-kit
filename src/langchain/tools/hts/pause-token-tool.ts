import { z } from 'zod';
import { PauseTokenParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const PauseTokenZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the token to pause (e.g., "0.0.xxxx").'),
});

export class HederaPauseTokenTool extends BaseHederaTransactionTool<
  typeof PauseTokenZodSchemaCore
> {
  name = 'hedera-hts-pause-token';
  description =
    'Pauses a token. Requires the tokenId. Use metaOptions for execution control.';
  specificInputSchema = PauseTokenZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof PauseTokenZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).pauseToken(
      specificArgs as unknown as PauseTokenParams
    );
  }
}
