import { z } from 'zod';
import { AIAgentCapability } from '@hashgraphonline/standards-sdk';
import {
  BaseHederaQueryTool,
  BaseHederaQueryToolParams,
} from '../common/base-hedera-query-tool';
import { HCS10Builder } from '../../../builders/hcs10/hcs10-builder';

export interface FindRegistrationsToolParams
  extends BaseHederaQueryToolParams {}

/**
 * A tool to search for registered HCS-10 agents using the configured registry.
 */
const FindRegistrationsZodSchema = z.object({
  accountId: z
    .string()
    .optional()
    .describe(
      'Optional: Filter registrations by a specific Hedera account ID (e.g., 0.0.12345).'
    ),
  tags: z
    .array(z.nativeEnum(AIAgentCapability))
    .optional()
    .describe(
      'Optional: Filter registrations by a list of tags (API filter only).'
    ),
});

export class FindRegistrationsTool extends BaseHederaQueryTool<
  typeof FindRegistrationsZodSchema
> {
  name = 'find_registrations';
  description =
    'Searches the configured agent registry for HCS-10 agents. You can filter by account ID or tags. Returns basic registration info.';
  specificInputSchema = FindRegistrationsZodSchema;
  namespace = 'hcs10';

  constructor(params: FindRegistrationsToolParams) {
    super(params);
  }

  protected async executeQuery({
    accountId,
    tags,
  }: z.infer<typeof FindRegistrationsZodSchema>): Promise<unknown> {
    const hcs10Builder = this.hederaKit.hcs10() as HCS10Builder;
    const params: { accountId?: string; tags?: number[] } = {};
    if (accountId) {
      params.accountId = accountId;
    }
    if (tags) {
      params.tags = tags;
    }
    await hcs10Builder.findRegistrations(params);

    const result = await hcs10Builder.execute();

    if (result.success && 'rawResult' in result && result.rawResult) {
      const raw = result.rawResult as {
        formattedOutput?: string;
        message?: string;
      };
      return {
        success: true,
        data: raw.formattedOutput || raw.message || 'Registrations searched',
      };
    }

    return result;
  }
}
