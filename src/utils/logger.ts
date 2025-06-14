/* eslint-disable no-console */
/**
 * @description Defines a simple Logger interface for the HederaAgentKit.
 */
export interface Logger {
  debug(message: string, ...optionalParams: unknown[]): void;
  info(message: string, ...optionalParams: unknown[]): void;
  warn(message: string, ...optionalParams: unknown[]): void;
  error(message: string, ...optionalParams: unknown[]): void;
}

/**
 * @description A basic console logger implementation.
 */
export class ConsoleLogger implements Logger {
  private static instance: ConsoleLogger;
  private readonly prefix: string;

  private constructor(prefix = '[HederaAgentKit]') {
    this.prefix = prefix;
  }

  public static getInstance(prefix?: string): ConsoleLogger {
    if (!ConsoleLogger.instance) {
      ConsoleLogger.instance = new ConsoleLogger(prefix);
    }
    return ConsoleLogger.instance;
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    console.debug(`${this.prefix} DEBUG: ${message}`, ...optionalParams);
  }

  info(message: string, ...optionalParams: unknown[]): void {
    console.info(`${this.prefix} INFO: ${message}`, ...optionalParams);
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    console.warn(`${this.prefix} WARN: ${message}`, ...optionalParams);
  }

  error(message: string, ...optionalParams: unknown[]): void {
    console.error(`${this.prefix} ERROR: ${message}`, ...optionalParams);
  }
}

export const defaultLogger = ConsoleLogger.getInstance(); 