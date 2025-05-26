import { z } from 'zod';
import { UnpauseTokenParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const UnpauseTokenZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the token to unpause (e.g., "0.0.xxxx").'),
});

export class HederaUnpauseTokenTool extends BaseHederaTransactionTool<
  typeof UnpauseTokenZodSchemaCore
> {
  name = 'hedera-hts-unpause-token';
  description =
    'Unpauses a token. Requires the tokenId. Use metaOptions for execution control.';
  specificInputSchema = UnpauseTokenZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof UnpauseTokenZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).unpauseToken(
      specificArgs as unknown as UnpauseTokenParams
    );
  }
}
