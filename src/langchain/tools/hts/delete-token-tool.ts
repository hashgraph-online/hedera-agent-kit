import { z } from 'zod';
import { DeleteTokenParams } from '../../../types';
import {
  BaseHederaTransactionTool,
  BaseHederaTransactionToolParams,
} from '../common/base-hedera-transaction-tool';
import { BaseServiceBuilder } from '../../../builders/base-service-builder';
import { HtsBuilder } from '../../../builders/hts/hts-builder';

const DeleteTokenZodSchemaCore = z.object({
  tokenId: z
    .string()
    .describe('The ID of the token to delete (e.g., "0.0.xxxx").'),
});

export class HederaDeleteTokenTool extends BaseHederaTransactionTool<
  typeof DeleteTokenZodSchemaCore
> {
  name = 'hedera-hts-delete-token';
  description =
    'Deletes a token. Requires the tokenId. Use metaOptions for execution control.';
  specificInputSchema = DeleteTokenZodSchemaCore;
  namespace = 'hts';

  constructor(params: BaseHederaTransactionToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return this.hederaKit.hts();
  }

  protected async callBuilderMethod(
    builder: BaseServiceBuilder,
    specificArgs: z.infer<typeof DeleteTokenZodSchemaCore>
  ): Promise<void> {
    await (builder as HtsBuilder).deleteToken(
      specificArgs as unknown as DeleteTokenParams
    );
  }
}
