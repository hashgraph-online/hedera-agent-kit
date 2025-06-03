import { z } from "zod";
import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { BaseHederaQueryTool, BaseHederaQueryToolParams } from "../common/base-hedera-query-tool";
import { BaseServiceBuilder } from "../../../builders/base-service-builder";
import { BonzoBuilder } from "../../../builders/bonzo/bonzo-builder";

const BonzoGetATokenBalanceZodSchemaCore = z.object({
  assetSymbol: z.string().describe("The asset symbol to check aToken balance for (e.g., HBAR, USDC, SAUCE)."),
  accountId: z.string().describe('The Hedera account ID to check the balance for (e.g., "0.0.789012").'),
});

export class GetBonzoATokenBalanceTool extends BaseHederaQueryTool<typeof BonzoGetATokenBalanceZodSchemaCore> {
  name = "get-bonzo-atoken-balance";
  description = "Fetches the aToken balance for a specified asset symbol and account ID from the Bonzo platform on Hedera.";
  specificInputSchema = BonzoGetATokenBalanceZodSchemaCore;
  namespace = "bonzo";

  constructor(params: BaseHederaQueryToolParams) {
    super(params);
  }

  protected getServiceBuilder(): BaseServiceBuilder {
    return new BonzoBuilder(this.hederaKit);
  }

  protected async callBuilderMethod(builder: BaseServiceBuilder, specificArgs: z.infer<typeof BonzoGetATokenBalanceZodSchemaCore>): Promise<any> {
    return await (builder as BonzoBuilder).getATokenBalance({
      assetSymbol: specificArgs.assetSymbol,
      accountId: specificArgs.accountId,
    });
  }

  protected async executeQuery(args: z.infer<typeof BonzoGetATokenBalanceZodSchemaCore>, runManager?: CallbackManagerForToolRun): Promise<unknown> {
    // Create the Bonzo builder
    const bonzoBuilder = new BonzoBuilder(this.hederaKit);

    // Execute the query using the builder
    const result = await bonzoBuilder.getATokenBalance({
      assetSymbol: args.assetSymbol,
      accountId: args.accountId,
    });

    // Return structured data that the base class can format
    return {
      success: true,
      data: {
        assetSymbol: args.assetSymbol,
        accountId: args.accountId,
        balance: result.balance,
        formattedBalance: result.formattedBalance,
        symbol: result.symbol,
        decimals: result.decimals,
      },
      message: `Balance for a${args.assetSymbol} (User: ${args.accountId}): ${result.formattedBalance} ${result.symbol}`,
    };
  }
}
