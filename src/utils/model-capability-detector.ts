import { ModelCapability } from '../types/model-capability';

/**
 * Model capability configuration for different AI models
 */
interface ModelConfig {
  capability: ModelCapability;
  contextWindow: number;
  description: string;
}

/**
 * OpenRouter API model response structure
 */
interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

/**
 * Static fallback registry for essential models (used when API is unavailable)
 */
const FALLBACK_MODEL_REGISTRY: Record<string, ModelConfig> = {
  'gpt-3.5-turbo': {
    capability: ModelCapability.SMALL,
    contextWindow: 16385,
    description: 'OpenAI GPT-3.5 Turbo',
  },
  'gpt-4': {
    capability: ModelCapability.LARGE,
    contextWindow: 8192,
    description: 'OpenAI GPT-4',
  },
  'gpt-4-turbo': {
    capability: ModelCapability.MEDIUM,
    contextWindow: 128000,
    description: 'OpenAI GPT-4 Turbo',
  },
  'gpt-4o': {
    capability: ModelCapability.MEDIUM,
    contextWindow: 128000,
    description: 'OpenAI GPT-4o',
  },
  'gpt-4o-mini': {
    capability: ModelCapability.SMALL,
    contextWindow: 128000,
    description: 'OpenAI GPT-4o Mini',
  },
  'o1-preview': {
    capability: ModelCapability.LARGE,
    contextWindow: 128000,
    description: 'OpenAI o1 Preview',
  },
  'o1-mini': {
    capability: ModelCapability.MEDIUM,
    contextWindow: 128000,
    description: 'OpenAI o1 Mini',
  },
  'o3-mini': {
    capability: ModelCapability.MEDIUM,
    contextWindow: 128000,
    description: 'OpenAI o3 Mini',
  },
  'claude-3.5-sonnet': {
    capability: ModelCapability.LARGE,
    contextWindow: 200000,
    description: 'Anthropic Claude 3.5 Sonnet',
  },
  'claude-4': {
    capability: ModelCapability.LARGE,
    contextWindow: 200000,
    description: 'Anthropic Claude 4',
  },
  'gemini-1.5-pro': {
    capability: ModelCapability.LARGE,
    contextWindow: 2000000,
    description: 'Google Gemini 1.5 Pro',
  },
};

/**
 * Model capability detector that provides scalable model capability inference
 * Fetches comprehensive model data from OpenRouter API and caches it
 */
export class ModelCapabilityDetector {
  private static instance: ModelCapabilityDetector;
  private registry: Record<string, ModelConfig>;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;
  private readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';

  private constructor() {
    this.registry = { ...FALLBACK_MODEL_REGISTRY };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ModelCapabilityDetector {
    if (!ModelCapabilityDetector.instance) {
      ModelCapabilityDetector.instance = new ModelCapabilityDetector();
    }
    return ModelCapabilityDetector.instance;
  }

  /**
   * Determine model capability based on context window and model characteristics
   */
  private determineCapability(model: OpenRouterModel): ModelCapability {
    const modelId = model.id.toLowerCase();
    const contextLength = model.context_length;

    if (
      modelId.includes('mini') ||
      modelId.includes('tiny') ||
      modelId.includes('light') ||
      modelId.includes('instant') ||
      modelId.includes('3.5-turbo')
    ) {
      return ModelCapability.SMALL;
    }

    if (
      modelId.includes('local') ||
      modelId.includes('llama') ||
      modelId.includes('mistral') ||
      modelId.includes('yi-') ||
      modelId.includes('qwen') ||
      modelId.includes('deepseek') ||
      modelId.includes('phi-') ||
      modelId.includes('mythomax') ||
      modelId.includes('valkyrie')
    ) {
      return ModelCapability.UNLIMITED;
    }
    if (contextLength <= 16000) {
      return ModelCapability.SMALL;
    } else if (contextLength <= 50000) {
      return ModelCapability.MEDIUM;
    } else {
      return ModelCapability.LARGE;
    }
  }

  /**
   * Fetch models from OpenRouter API
   */
  private async fetchModelsFromAPI(): Promise<void> {
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

      this.registry = { ...FALLBACK_MODEL_REGISTRY };

      for (const model of models) {
        const config: ModelConfig = {
          capability: this.determineCapability(model),
          contextWindow: model.context_length,
          description: model.name,
        };

        this.registry[model.id] = config;

        const simplifiedId = this.getSimplifiedModelId(model.id);
        if (simplifiedId !== model.id) {
          this.registry[simplifiedId] = config;
        }
      }

      this.lastFetchTime = Date.now();
      console.log(
        `ModelCapabilityDetector: Loaded ${models.length} models from OpenRouter API`
      );
    } catch (error) {
      console.warn(
        `ModelCapabilityDetector: Failed to fetch from API, using fallback registry:`,
        error
      );
    }
  }

  /**
   * Get simplified model ID for common patterns
   */
  private getSimplifiedModelId(fullId: string): string {
    if (fullId.startsWith('openai/')) {
      return fullId.replace('openai/', '');
    }
    if (fullId.startsWith('anthropic/')) {
      return fullId.replace('anthropic/', '');
    }
    if (fullId.startsWith('google/')) {
      return fullId.replace('google/', '');
    }
    if (fullId.startsWith('mistralai/')) {
      return fullId.replace('mistralai/', '');
    }
    if (fullId.startsWith('meta-llama/')) {
      return fullId.replace('meta-llama/', '');
    }

    return fullId;
  }

  /**
   * Ensure models are loaded and up-to-date
   */
  private async ensureModelsLoaded(): Promise<void> {
    const now = Date.now();
    const shouldRefresh = now - this.lastFetchTime > this.CACHE_DURATION;

    if (shouldRefresh) {
      await this.fetchModelsFromAPI();
    }
  }

  /**
   * Register a new model configuration
   */
  public registerModel(modelName: string, config: ModelConfig): void {
    this.registry[modelName] = config;
  }

  /**
   * Register multiple models at once
   */
  public registerModels(models: Record<string, ModelConfig>): void {
    Object.assign(this.registry, models);
  }

  /**
   * Get model capability for a given model name
   */
  public async getModelCapability(
    modelName?: string
  ): Promise<ModelCapability> {
    if (!modelName) {
      return ModelCapability.MEDIUM;
    }

    await this.ensureModelsLoaded();

    const exactMatch = this.registry[modelName];
    if (exactMatch) {
      return exactMatch.capability;
    }

    const normalizedName = modelName.toLowerCase();

    for (const [registeredName, config] of Object.entries(this.registry)) {
      if (
        normalizedName.includes(registeredName.toLowerCase()) ||
        registeredName.toLowerCase().includes(normalizedName)
      ) {
        return config.capability;
      }
    }

    return this.getCapabilityFromHeuristics(normalizedName);
  }

  /**
   * Synchronous version that uses cached data only
   */
  public getModelCapabilitySync(modelName?: string): ModelCapability {
    if (!modelName) {
      return ModelCapability.MEDIUM;
    }

    const exactMatch = this.registry[modelName];
    if (exactMatch) {
      return exactMatch.capability;
    }

    const normalizedName = modelName.toLowerCase();

    for (const [registeredName, config] of Object.entries(this.registry)) {
      if (
        normalizedName.includes(registeredName.toLowerCase()) ||
        registeredName.toLowerCase().includes(normalizedName)
      ) {
        return config.capability;
      }
    }

    return this.getCapabilityFromHeuristics(normalizedName);
  }

  /**
   * Fallback heuristics for unknown models
   */
  private getCapabilityFromHeuristics(normalizedName: string): ModelCapability {
    if (
      normalizedName.includes('mini') ||
      normalizedName.includes('3.5') ||
      normalizedName.includes('tiny') ||
      normalizedName.includes('light') ||
      normalizedName.includes('instant')
    ) {
      return ModelCapability.SMALL;
    }

    if (
      normalizedName.includes('turbo') ||
      normalizedName.includes('4o') ||
      normalizedName.includes('flash') ||
      normalizedName.includes('small') ||
      normalizedName.includes('medium') ||
      normalizedName.includes('haiku') ||
      normalizedName.includes('bison') ||
      normalizedName.includes('palm')
    ) {
      return ModelCapability.MEDIUM;
    }

    if (
      normalizedName.includes('claude') ||
      normalizedName.includes('gpt-4') ||
      normalizedName.includes('gemini') ||
      normalizedName.includes('sonnet') ||
      normalizedName.includes('opus') ||
      normalizedName.includes('large') ||
      normalizedName.includes('ultra') ||
      normalizedName.includes('mixtral') ||
      normalizedName.includes('command-r') ||
      normalizedName.includes('o1') ||
      normalizedName.includes('o3')
    ) {
      return ModelCapability.LARGE;
    }

    if (
      normalizedName.includes('local') ||
      normalizedName.includes('ollama') ||
      normalizedName.includes('llama') ||
      normalizedName.includes('mistral') ||
      normalizedName.includes('yi-') ||
      normalizedName.includes('qwen') ||
      normalizedName.includes('deepseek') ||
      normalizedName.includes('phi-')
    ) {
      return ModelCapability.UNLIMITED;
    }

    return ModelCapability.MEDIUM;
  }

  /**
   * Get model configuration for a given model name
   */
  public async getModelConfig(
    modelName: string
  ): Promise<ModelConfig | undefined> {
    await this.ensureModelsLoaded();
    return this.registry[modelName];
  }

  /**
   * Get context window size for a given model name
   */
  public async getContextWindow(modelName?: string): Promise<number> {
    if (!modelName) {
      return 16385;
    }

    await this.ensureModelsLoaded();

    const exactMatch = this.registry[modelName];
    if (exactMatch) {
      return exactMatch.contextWindow;
    }

    const normalizedName = modelName.toLowerCase();

    for (const [registeredName, config] of Object.entries(this.registry)) {
      if (
        normalizedName.includes(registeredName.toLowerCase()) ||
        registeredName.toLowerCase().includes(normalizedName)
      ) {
        return config.contextWindow;
      }
    }

    return 16385;
  }

  /**
   * Synchronous version that uses cached data only for context window
   */
  public getContextWindowSync(modelName?: string): number {
    if (!modelName) {
      return 16385;
    }

    const exactMatch = this.registry[modelName];
    if (exactMatch) {
      return exactMatch.contextWindow;
    }

    const normalizedName = modelName.toLowerCase();

    for (const [registeredName, config] of Object.entries(this.registry)) {
      if (
        normalizedName.includes(registeredName.toLowerCase()) ||
        registeredName.toLowerCase().includes(normalizedName)
      ) {
        return config.contextWindow;
      }
    }

    return 16385;
  }

  /**
   * Get all registered models
   */
  public async getAllModels(): Promise<Record<string, ModelConfig>> {
    await this.ensureModelsLoaded();
    return { ...this.registry };
  }

  /**
   * Check if a model is registered
   */
  public async isModelRegistered(modelName: string): Promise<boolean> {
    await this.ensureModelsLoaded();
    return modelName in this.registry;
  }

  /**
   * Get models by capability
   */
  public async getModelsByCapability(
    capability: ModelCapability
  ): Promise<string[]> {
    await this.ensureModelsLoaded();
    return Object.entries(this.registry)
      .filter(([, config]) => config.capability === capability)
      .map(([name]) => name);
  }

  /**
   * Force refresh models from API
   */
  public async refreshModels(): Promise<void> {
    this.lastFetchTime = 0;
    await this.fetchModelsFromAPI();
  }

  /**
   * Get cache status
   */
  public getCacheStatus(): {
    lastFetch: Date;
    isStale: boolean;
    modelCount: number;
  } {
    const now = Date.now();
    const isStale = now - this.lastFetchTime > this.CACHE_DURATION;

    return {
      lastFetch: new Date(this.lastFetchTime),
      isStale,
      modelCount: Object.keys(this.registry).length,
    };
  }
}
