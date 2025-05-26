import { StructuredTool, ToolParams } from '@langchain/core/tools';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';
import { HederaAgentKit } from '../../../agent/agent';
import { Logger as StandardsSdkLogger } from '@hashgraphonline/standards-sdk';
import { ModelCapabilityDetector } from '../../../utils/model-capability-detector';
import { ModelCapability } from '../../../types/model-capability';

/**
 * Field processing configuration
 */
export interface FieldProcessor {
  maxLength?: number;
  truncateMessage?: string;
  summarize?: boolean;
  exclude?: boolean;
}

/**
 * Response processing strategy
 */
export interface ResponseStrategy {
  maxTokens: number;
  summarizeArrays?: boolean;
  maxArrayLength?: number;
  includeMetadata?: boolean;
}

/**
 * Model-specific response strategies
 */
const MODEL_STRATEGIES: Record<ModelCapability, ResponseStrategy> = {
  [ModelCapability.SMALL]: {
    maxTokens: 4000,
    summarizeArrays: true,
    maxArrayLength: 3,
    includeMetadata: true,
  },
  [ModelCapability.MEDIUM]: {
    maxTokens: 12000,
    summarizeArrays: false,
    maxArrayLength: 10,
    includeMetadata: true,
  },
  [ModelCapability.LARGE]: {
    maxTokens: 32000,
    summarizeArrays: false,
    maxArrayLength: 50,
    includeMetadata: false,
  },
  [ModelCapability.UNLIMITED]: {
    maxTokens: Infinity,
    summarizeArrays: false,
    includeMetadata: false,
  },
};

/**
 * Parameters required to initialize a BaseHederaQueryTool.
 */
export interface BaseHederaQueryToolParams extends ToolParams {
  hederaKit: HederaAgentKit;
  logger?: StandardsSdkLogger;
  modelCapability?: ModelCapability;
  customStrategy?: Partial<ResponseStrategy>;
}

/**
 * Base class for all Hedera query tools.
 * Handles common query processing logic across different tool types.
 * Unlike transaction tools, query tools are read-only and don't require signing.
 *
 * @template S - The Zod schema that defines the input parameters for the specific tool
 */
export abstract class BaseHederaQueryTool<
  //@ts-ignore
  S extends z.ZodObject<unknown, unknown, unknown, unknown>
  //@ts-ignore
> extends StructuredTool<S> {
  protected hederaKit: HederaAgentKit;
  protected logger: StandardsSdkLogger;
  protected responseStrategy: ResponseStrategy;
  protected modelCapability: ModelCapability;
  private notes: string[] = [];

  abstract specificInputSchema: S;
  abstract namespace: string;

  get schema(): S {
    return this.specificInputSchema;
  }

  constructor({
    hederaKit,
    logger,
    modelCapability = ModelCapability.MEDIUM,
    customStrategy,
    ...rest
  }: BaseHederaQueryToolParams) {
    super(rest);
    this.hederaKit = hederaKit;
    this.logger = logger || hederaKit.logger;
    this.modelCapability = modelCapability;

    const baseStrategy = MODEL_STRATEGIES[modelCapability];
    this.responseStrategy = { ...baseStrategy, ...customStrategy };

    this.logger.debug(
      `Initialized query tool with ${modelCapability} capability strategy`
    );
  }

  /**
   * Execute the specific query operation.
   * This method should be implemented by concrete query tools.
   */
  protected abstract executeQuery(
    args: z.infer<S>,
    runManager?: CallbackManagerForToolRun
  ): Promise<unknown>;

  /**
   * Tools can define which fields should be processed for size optimization.
   * Return a map of field paths to processing configurations.
   * Field paths support dot notation (e.g., 'contract.bytecode') and wildcards (e.g., '*.bytecode')
   */
  protected getLargeFieldProcessors?(
    args: z.infer<S>
  ): Record<string, FieldProcessor>;

  /**
   * Allow tools to define custom response processing logic
   */
  protected processCustomResponse?(result: unknown, args: z.infer<S>): unknown;

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if a field path matches a pattern (supports wildcards)
   */
  private matchesPattern(fieldPath: string, pattern: string): boolean {
    if (pattern === fieldPath) return true;
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '[^.]*') + '$');
      return regex.test(fieldPath);
    }
    return false;
  }

  /**
   * Process any data structure based on field processors and strategy
   */
  private processData(
    data: unknown,
    args: z.infer<S>,
    path: string = ''
  ): unknown {
    if (this.responseStrategy.maxTokens === Infinity) {
      return data;
    }

    const processors = this.getLargeFieldProcessors
      ? this.getLargeFieldProcessors(args)
      : {};

    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return this.processArray(data, args, path);
    }

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      return this.processObject(
        data as Record<string, unknown>,
        args,
        path,
        processors
      );
    }

    if (typeof data === 'string') {
      return this.processString(data, path, processors);
    }

    return data;
  }

  /**
   * Process array data
   */
  private processArray(
    arr: unknown[],
    args: z.infer<S>,
    path: string
  ): unknown[] {
    const processedArray = arr.map((item, index) =>
      this.processData(item, args, `${path}[${index}]`)
    );

    if (
      this.responseStrategy.summarizeArrays &&
      this.responseStrategy.maxArrayLength &&
      arr.length > this.responseStrategy.maxArrayLength
    ) {
      const maxLength = this.responseStrategy.maxArrayLength;
      const takeFirst = Math.floor(maxLength / 2);
      const takeLast = maxLength - takeFirst - 1;

      return [
        ...processedArray.slice(0, takeFirst),
        {
          _summary: `[${arr.length - maxLength} items truncated]`,
          _originalLength: arr.length,
          _truncatedAt: path,
        },
        ...processedArray.slice(-takeLast),
      ];
    }

    return processedArray;
  }

  /**
   * Process object data
   */
  private processObject(
    obj: Record<string, unknown>,
    args: z.infer<S>,
    path: string,
    processors: Record<string, FieldProcessor>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key;

      const matchingEntry = Object.entries(processors).find(([pattern]) =>
        this.matchesPattern(fieldPath, pattern)
      );
      const matchingProcessor = matchingEntry ? matchingEntry[1] : undefined;

      if (matchingProcessor && matchingProcessor.exclude) {
        continue;
      }

      result[key] = this.processData(value, args, fieldPath);
    }

    return result;
  }

  /**
   * Process string data
   */
  private processString(
    str: string,
    path: string,
    processors: Record<string, FieldProcessor>
  ): string {
    const matchingEntry = Object.entries(processors).find(([pattern]) =>
      this.matchesPattern(path, pattern)
    );
    const matchingProcessor = matchingEntry ? matchingEntry[1] : undefined;

    if (
      matchingProcessor &&
      matchingProcessor.maxLength &&
      str.length > matchingProcessor.maxLength
    ) {
      const truncated = str.substring(0, matchingProcessor.maxLength);
      const message = matchingProcessor.truncateMessage
        ? matchingProcessor.truncateMessage
        : `[TRUNCATED: ${str.length} chars total]`;
      return `${truncated}...${message}`;
    }

    return str;
  }

  /**
   * Format the query result for return to the LLM.
   * Override this method to customize result formatting.
   */
  protected formatResult(result: unknown, args?: z.infer<S>): string {
    if (typeof result === 'string') {
      return result;
    }

    let processedResult = result;

    if (this.processCustomResponse && args) {
      processedResult = this.processCustomResponse(processedResult, args);
    }

    processedResult = this.processData(
      processedResult,
      args || ({} as z.infer<S>)
    );

    const jsonString = JSON.stringify(processedResult, null, 2);
    const estimatedTokens = this.estimateTokens(jsonString);

    if (
      this.responseStrategy.includeMetadata &&
      estimatedTokens > this.responseStrategy.maxTokens * 0.8
    ) {
      const responseWithMeta = {
        ...(typeof processedResult === 'object' && processedResult !== null
          ? processedResult
          : { data: processedResult }),
        _meta: {
          estimatedTokens,
          maxTokens: this.responseStrategy.maxTokens,
          capability: Object.keys(MODEL_STRATEGIES).find(
            (key) =>
              MODEL_STRATEGIES[key as ModelCapability] === this.responseStrategy
          ),
          note: 'Response may be truncated. Use higher model capability for full data.',
        },
      };
      return JSON.stringify(responseWithMeta, null, 2);
    }

    return jsonString;
  }

  /**
   * Handle errors that occur during query execution.
   */
  protected handleError(error: unknown): string {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    this.logger.error(`Error in query tool: ${errorMessage}`, error);
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }

  /**
   * Main method called when the tool is executed.
   * Processes arguments, executes the query, and formats the result.
   */
  protected async _call(
    args: z.infer<S>,
    runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    this.clearNotes();

    try {
      this.logger.info(
        `Executing ${this.name} with model capability: ${this.modelCapability}`
      );

      const rawData = await this.executeQuery(args, runManager);
      const processed = await this.processLargeFields(rawData, args);

      const allNotes = this.getNotes();

      if (
        typeof processed.data === 'object' &&
        processed.data !== null &&
        'success' in processed.data
      ) {
        const toolResponse = processed.data as any;
        const response = {
          ...toolResponse,
          ...(allNotes.length > 0 && {
            notes: [...(toolResponse.notes || []), ...allNotes],
          }),
        };
        return JSON.stringify(response);
      }

      const response = {
        success: true,
        data: processed.data,
        ...(allNotes.length > 0 && { notes: allNotes }),
      };

      return JSON.stringify(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in ${this.name}: ${errorMessage}`, error);

      const allNotes = this.getNotes();
      return JSON.stringify({
        success: false,
        error: errorMessage,
        ...(allNotes.length > 0 && { notes: allNotes }),
      });
    }
  }

  private async getModelCapabilityLimits(): Promise<{
    maxTokens: number;
    arrayLimit: number;
  }> {
    if (this.modelCapability === ModelCapability.UNLIMITED) {
      return { maxTokens: Infinity, arrayLimit: Infinity };
    }

    try {
      const detector = ModelCapabilityDetector.getInstance();

      if (this.hederaKit.modelName) {
        const contextWindow = await detector.getContextWindow(
          this.hederaKit.modelName
        );
        if (contextWindow > 0) {
          const toolDefinitionsReserve = Math.floor(contextWindow * 0.6);
          const responseReserve = Math.floor(contextWindow * 0.2);
          const availableTokens =
            contextWindow - toolDefinitionsReserve - responseReserve;
          const arrayLimit = this.calculateArrayLimit(availableTokens);

          return {
            maxTokens: Math.max(availableTokens, 1000),
            arrayLimit,
          };
        }
      }

      const allModels = await detector.getAllModels();
      let maxContextWindow = 0;
      for (const [, config] of Object.entries(allModels)) {
        if (
          config.capability === this.modelCapability &&
          config.contextWindow > maxContextWindow
        ) {
          maxContextWindow = config.contextWindow;
        }
      }

      if (maxContextWindow > 0) {
        const toolDefinitionsReserve = Math.floor(maxContextWindow * 0.6);
        const responseReserve = Math.floor(maxContextWindow * 0.2);
        const availableTokens =
          maxContextWindow - toolDefinitionsReserve - responseReserve;
        const arrayLimit = this.calculateArrayLimit(availableTokens);

        return {
          maxTokens: Math.max(availableTokens, 1000),
          arrayLimit,
        };
      }
    } catch (error) {
      this.logger.warn(
        'Failed to get model context window, using fallback limits',
        error
      );
    }

    switch (this.modelCapability) {
      case ModelCapability.SMALL:
        return { maxTokens: 1000, arrayLimit: 3 };
      case ModelCapability.MEDIUM:
        return { maxTokens: 4000, arrayLimit: 10 };
      case ModelCapability.LARGE:
        return { maxTokens: 12000, arrayLimit: 30 };
      default:
        return { maxTokens: 4000, arrayLimit: 10 };
    }
  }

  private calculateArrayLimit(availableTokens: number): number {
    if (availableTokens < 8000) {
      return 5;
    }
    if (availableTokens < 50000) {
      return 20;
    }
    if (availableTokens < 100000) {
      return 50;
    }
    return 100;
  }

  private addNote(note: string): void {
    this.notes.push(note);
  }

  private clearNotes(): void {
    this.notes = [];
  }

  private getNotes(): string[] {
    return [...this.notes];
  }

  private async processLargeFields(
    data: unknown,
    args?: z.infer<S>
  ): Promise<{ data: unknown; notes: string[] }> {
    const result: { data: unknown; notes: string[] } = {
      data: JSON.parse(JSON.stringify(data)),
      notes: [],
    };

    if (this.modelCapability === ModelCapability.UNLIMITED) {
      return result;
    }

    const processors =
      this.getLargeFieldProcessors && args
        ? this.getLargeFieldProcessors(args)
        : {};
    const limits = await this.getModelCapabilityLimits();

    for (const [path, processorConfig] of Object.entries(processors)) {
      const value = this.getNestedValue(result.data, path);
      if (
        typeof value === 'string' &&
        processorConfig.maxLength &&
        value.length > processorConfig.maxLength
      ) {
        const truncated = value.substring(0, processorConfig.maxLength);
        this.setNestedValue(result.data, path, truncated);

        const userFriendlyMessage = processorConfig.truncateMessage
          ? processorConfig.truncateMessage
          : `Large data field was shortened to fit your model's capacity`;
        this.addNote(
          `${userFriendlyMessage}. Original size: ${value.length} characters, shown: ${processorConfig.maxLength} characters.`
        );
      }
    }

    result.data = this.processDataStructure(result.data, limits, result.notes);
    return result;
  }

  private processDataStructure(
    data: unknown,
    limits: { maxTokens: number; arrayLimit: number },
    notes: string[]
  ): unknown {
    if (Array.isArray(data)) {
      if (data.length > limits.arrayLimit) {
        const truncated = data.slice(0, limits.arrayLimit);
        this.addNote(
          `List was shortened to fit your model's capacity. Showing ${limits.arrayLimit} of ${data.length} items.`
        );
        return truncated.map((item) =>
          this.processDataStructure(item, limits, notes)
        );
      }
      return data.map((item) => this.processDataStructure(item, limits, notes));
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        data as Record<string, unknown>
      )) {
        processed[key] = this.processDataStructure(value, limits, notes);
      }
      return processed;
    }

    return data;
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      const currentObj = current as Record<string, unknown>;

      if (key.includes('[') && key.includes(']')) {
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        const arrayValue = currentObj[arrayKey];
        return Array.isArray(arrayValue) ? arrayValue[index] : undefined;
      }

      return currentObj[key];
    }, obj);
  }

  private setNestedValue(obj: unknown, path: string, value: unknown): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current || typeof current !== 'object') {
        return current;
      }

      const currentObj = current as Record<string, unknown>;

      if (key.includes('[') && key.includes(']')) {
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        const arrayValue = currentObj[arrayKey];
        return Array.isArray(arrayValue) ? arrayValue[index] : undefined;
      }

      return currentObj[key];
    }, obj);

    if (!target || typeof target !== 'object') {
      return;
    }

    const targetObj = target as Record<string, unknown>;

    if (lastKey.includes('[') && lastKey.includes(']')) {
      const [arrayKey, indexStr] = lastKey.split('[');
      const index = parseInt(indexStr.replace(']', ''));
      const arrayValue = targetObj[arrayKey];
      if (Array.isArray(arrayValue)) {
        arrayValue[index] = value;
      }
    } else {
      targetObj[lastKey] = value;
    }
  }
}
