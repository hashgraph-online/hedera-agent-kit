import chalk from 'chalk';

const primaryBlue = chalk.hex('#2d84eb');
const warningColor = chalk.hex('#464646').dim;
const errorColor = chalk.hex('#464646');
const charcoal = chalk.hex('#464646');

let initializationComplete = false;

const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

const formatPinoLog = (chunk: string): string => {
  if (chunk.includes('] INFO:')) {
    return chunk
      .replace(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} [+-]\d{4}\] INFO:/, primaryBlue('ℹ️  INFO:'))
      .replace(/module: "([^"]+)"/, charcoal.dim('($1)'));
  }
  if (chunk.includes('] WARN:')) {
    return chunk
      .replace(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} [+-]\d{4}\] WARN:/, warningColor('⚠️  WARN:'))
      .replace(/module: "([^"]+)"/, charcoal.dim('($1)'));
  }
  if (chunk.includes('] ERROR:')) {
    return chunk
      .replace(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} [+-]\d{4}\] ERROR:/, errorColor('❌ ERROR:'))
      .replace(/module: "([^"]+)"/, charcoal.dim('($1)'));
  }
  if (chunk.includes('] DEBUG:')) {
    return chunk
      .replace(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} [+-]\d{4}\] DEBUG:/, charcoal.dim('🐛 DEBUG:'))
      .replace(/module: "([^"]+)"/, charcoal.dim('($1)'));
  }
  return chunk;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.stdout.write = function(chunk: any, ...args: any[]): boolean {
  if (typeof chunk === 'string') {
    if (!initializationComplete) {
      if (chunk.includes('] INFO:') || chunk.includes('] WARN:') || chunk.includes('] DEBUG:') || chunk.includes('ModelCapabilityDetector:')) {
        return true;
      }
    } else {
      if (chunk.includes('] INFO:') || chunk.includes('] WARN:') || chunk.includes('] ERROR:') || chunk.includes('] DEBUG:')) {
        const brandedChunk = formatPinoLog(chunk);
        return originalStdoutWrite.call(this, charcoal.dim(brandedChunk), ...args);
      }
    }
  }
  return originalStdoutWrite.call(this, chunk, ...args);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.stderr.write = function(chunk: any, ...args: any[]): boolean {
  if (!initializationComplete && typeof chunk === 'string') {
    if (chunk.includes('DeprecationWarning') || chunk.includes('MaxListenersExceededWarning')) {
      return true;
    }
  }
  return originalStderrWrite.call(this, chunk, ...args);
};

export function enableHederaLogging(): void {
  initializationComplete = true;
}

export function disableHederaLogging(): void {
  initializationComplete = false;
}