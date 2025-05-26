import { z } from 'zod';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';

const GetAccountPublicKeyZodSchema = z.object({
  accountId: z
    .string()
    .describe('The account ID to get the public key for (e.g., "0.0.12345")'),
});

/**
 * Tool for retrieving a Hedera account's public key.
 * This is a read-only operation that queries the mirror node.
 */
export class HederaGetAccountPublicKeyTool extends BaseHederaQueryTool<
  typeof GetAccountPublicKeyZodSchema
> {
  name = 'hedera-get-account-public-key';
  description =
    'Retrieves the public key for a Hedera account. Returns the public key in string format.';
  specificInputSchema = GetAccountPublicKeyZodSchema;
  namespace = 'account';

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected async executeQuery(
    args: z.infer<typeof GetAccountPublicKeyZodSchema>
  ): Promise<unknown> {
    this.logger.info(`Getting public key for account ID: ${args.accountId}`);
    
    const publicKey = await this.hederaKit.query().getPublicKey(args.accountId);
    
    if (!publicKey) {
      return {
        success: false,
        error: `Could not retrieve public key for account ${args.accountId}`,
      };
    }

    return {
      success: true,
      accountId: args.accountId,
      publicKey: publicKey.toString(),
      publicKeyDer: publicKey.toStringDer(),
      publicKeyRaw: publicKey.toStringRaw(),
    };
  }
} 
 