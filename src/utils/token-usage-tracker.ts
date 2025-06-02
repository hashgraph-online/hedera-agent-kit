import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { Logger } from '@hashgraphonline/standards-sdk';

/**
 * Token usage data structure
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  modelName?: string | undefined;
  timestamp?: Date | undefined;
}

/**
 * Cost calculation result
 */
export interface CostCalculation {
  promptCost: number;
  completionCost: number;
  totalCost: number;
  currency: string;
}

/**
 * OpenRouter model pricing structure
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
}

/**
 * Model pricing manager that fetches and caches pricing from OpenRouter API
 */
export class ModelPricingManager {
  private static instance: ModelPricingManager;
  private pricingCache: Map<string, { prompt: number; completion: number }> =
    new Map();
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;
  private readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';
  private logger: Logger;

  private constructor() {
    this.logger = new Logger({ module: 'ModelPricingManager', level: 'info' });
    this.initializeFallbackPricing();
  }

  public static getInstance(): ModelPricingManager {
    if (!ModelPricingManager.instance) {
      ModelPricingManager.instance = new ModelPricingManager();
    }
    return ModelPricingManager.instance;
  }

  private initializeFallbackPricing(): void {
    const fallbackPricing = {
      'gpt-4o': { prompt: 0.005, completion: 0.015 },
      'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    };

    for (const [model, pricing] of Object.entries(fallbackPricing)) {
      this.pricingCache.set(model, pricing);
    }
  }

  private async fetchPricingFromAPI(): Promise<void> {
    try {
      const response = await fetch(this.OPENROUTER_API_URL, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'hedera-agent-kit/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models: OpenRouterModel[] = data.data || [];

      for (const model of models) {
        if (model.pricing?.prompt && model.pricing?.completion) {
          const promptPrice = parseFloat(model.pricing.prompt);
          const completionPrice = parseFloat(model.pricing.completion);

          if (!isNaN(promptPrice) && !isNaN(completionPrice)) {
            this.pricingCache.set(model.id, {
              prompt: promptPrice * 1000,
              completion: completionPrice * 1000,
            });

            const simplifiedId = this.getSimplifiedModelId(model.id);
            if (simplifiedId !== model.id) {
              this.pricingCache.set(simplifiedId, {
                prompt: promptPrice * 1000,
                completion: completionPrice * 1000,
              });
            }
          }
        }
      }

      this.lastFetchTime = Date.now();
      this.logger.info(
        `Loaded pricing for ${models.length} models from OpenRouter API`
      );
    } catch (error) {
      this.logger.warn(
        'Failed to fetch pricing from API, using fallback pricing',
        error
      );
    }
  }

  private getSimplifiedModelId(fullId: string): string {
    const prefixes = [
      'openai/',
      'anthropic/',
      'google/',
      'mistralai/',
      'meta-llama/',
    ];
    for (const prefix of prefixes) {
      if (fullId.startsWith(prefix)) {
        return fullId.replace(prefix, '');
      }
    }
    return fullId;
  }

  private async ensurePricingLoaded(): Promise<void> {
    const now = Date.now();
    const shouldRefresh = now - this.lastFetchTime > this.CACHE_DURATION;

    if (shouldRefresh || this.pricingCache.size < 10) {
      await this.fetchPricingFromAPI();
    }
  }

  public async getPricing(
    modelName: string
  ): Promise<{ prompt: number; completion: number }> {
    await this.ensurePricingLoaded();

    const exactMatch = this.pricingCache.get(modelName);
    if (exactMatch) {
      return exactMatch;
    }

    const normalizedName = modelName.toLowerCase();
    for (const [key, value] of this.pricingCache.entries()) {
      if (
        key.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(key.toLowerCase())
      ) {
        return value;
      }
    }

    return (
      this.pricingCache.get('gpt-4o-mini') || {
        prompt: 0.00015,
        completion: 0.0006,
      }
    );
  }

  public getPricingSync(modelName: string): {
    prompt: number;
    completion: number;
  } {
    const exactMatch = this.pricingCache.get(modelName);
    if (exactMatch) {
      return exactMatch;
    }

    const normalizedName = modelName.toLowerCase();
    for (const [key, value] of this.pricingCache.entries()) {
      if (
        key.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(key.toLowerCase())
      ) {
        return value;
      }
    }

    return (
      this.pricingCache.get('gpt-4o-mini') || {
        prompt: 0.00015,
        completion: 0.0006,
      }
    );
  }
}

/**
 * Callback handler to track token usage from OpenAI API responses
 */
export class TokenUsageCallbackHandler extends BaseCallbackHandler {
  name = 'TokenUsageCallbackHandler';
  private tokenUsageHistory: TokenUsage[] = [];
  private currentTokenUsage: TokenUsage | undefined = undefined;
  private logger: Logger;
  private modelName?: string | undefined;

  constructor(modelName?: string, logger?: Logger) {
    super();
    this.modelName = modelName;
    this.logger =
      logger || new Logger({ module: 'TokenUsageTracker', level: 'info' });
  }

  override async handleLLMEnd(output: LLMResult): Promise<void> {
    try {
      if (output.llmOutput?.tokenUsage) {
        this.currentTokenUsage = {
          promptTokens: output.llmOutput.tokenUsage.promptTokens || 0,
          completionTokens: output.llmOutput.tokenUsage.completionTokens || 0,
          totalTokens: output.llmOutput.tokenUsage.totalTokens || 0,
          modelName: this.modelName,
          timestamp: new Date(),
        };

        this.tokenUsageHistory.push(this.currentTokenUsage);

        this.logger.debug('Token usage tracked:', {
          promptTokens: this.currentTokenUsage.promptTokens,
          completionTokens: this.currentTokenUsage.completionTokens,
          totalTokens: this.currentTokenUsage.totalTokens,
          model: this.modelName,
        });
      }
    } catch (error) {
      this.logger.error('Failed to track token usage:', error);
    }
  }

  getLatestTokenUsage(): TokenUsage | undefined {
    return this.currentTokenUsage;
  }

  getTokenUsageHistory(): TokenUsage[] {
    return [...this.tokenUsageHistory];
  }

  getTotalTokenUsage(): TokenUsage {
    const total = this.tokenUsageHistory.reduce(
      (acc, usage) => ({
        promptTokens: acc.promptTokens + usage.promptTokens,
        completionTokens: acc.completionTokens + usage.completionTokens,
        totalTokens: acc.totalTokens + usage.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );

    return {
      ...total,
      modelName: this.modelName,
      timestamp: new Date(),
    };
  }

  reset(): void {
    this.currentTokenUsage = undefined;
    this.tokenUsageHistory = [];
  }
}

/**
 * Calculate cost based on token usage and model with dynamic pricing
 */
export async function calculateTokenCost(
  tokenUsage: TokenUsage,
  modelName?: string
): Promise<CostCalculation> {
  const model = modelName || tokenUsage.modelName || 'gpt-4o-mini';
  const pricingManager = ModelPricingManager.getInstance();
  const pricing = await pricingManager.getPricing(model);

  const promptCost = (tokenUsage.promptTokens / 1000) * pricing.prompt;
  const completionCost =
    (tokenUsage.completionTokens / 1000) * pricing.completion;

  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost,
    currency: 'USD',
  };
}

/**
 * Synchronous version of calculateTokenCost using cached pricing
 */
export function calculateTokenCostSync(
  tokenUsage: TokenUsage,
  modelName?: string
): CostCalculation {
  const model = modelName || tokenUsage.modelName || 'gpt-4o-mini';
  const pricingManager = ModelPricingManager.getInstance();
  const pricing = pricingManager.getPricingSync(model);

  const promptCost = (tokenUsage.promptTokens / 1000) * pricing.prompt;
  const completionCost =
    (tokenUsage.completionTokens / 1000) * pricing.completion;

  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost,
    currency: 'USD',
  };
}

/**
 * Format cost for display
 */
export function formatCost(
  cost: CostCalculation,
  precision: number = 6
): string {
  return `$${cost.totalCost.toFixed(precision)} ${cost.currency}`;
}

/**
 * Estimate tokens from text (rough approximation)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
