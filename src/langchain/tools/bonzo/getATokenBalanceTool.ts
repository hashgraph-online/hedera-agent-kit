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
    const result = await (builder as BonzoBuilder).getATokenBalance({
      assetSymbol: specificArgs.assetSymbol,
      accountId: specificArgs.accountId,
    });

    // Return enhanced structure with additional metadata that tests expect
    return {
      assetSymbol: specificArgs.assetSymbol,
      accountId: specificArgs.accountId,
      balance: result.balance,
      formattedBalance: result.formattedBalance,
      symbol: result.symbol,
      decimals: result.decimals,
      message: `Balance for a${specificArgs.assetSymbol} (User: ${specificArgs.accountId}): ${result.formattedBalance} ${result.symbol}`,
    };
  }

  protected async executeQuery(args: z.infer<typeof BonzoGetATokenBalanceZodSchemaCore>, runManager?: CallbackManagerForToolRun): Promise<unknown> {
    // This method is required by the base class but not used in our current architecture
    // The main logic is in callBuilderMethod which is called by the base class _call method
    const builder = this.getServiceBuilder();
    return this.callBuilderMethod(builder, args);
  }
}
