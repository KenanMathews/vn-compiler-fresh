/**
 * Logger utility for VN Compiler
 * Provides consistent logging across the application
 */

export interface LogLevel {
    ERROR: 0;
    WARN: 1; 
    INFO: 2;
    DEBUG: 3;
    VERBOSE: 4;
  }
  
  export const LOG_LEVELS: LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    VERBOSE: 4
  };
  
  export class Logger {
    private level: number;
    private enableColors: boolean;
  
    constructor(verbose: boolean = false, enableColors: boolean = true) {
      this.level = verbose ? LOG_LEVELS.VERBOSE : LOG_LEVELS.INFO;
      this.enableColors = enableColors && !this.isTestEnvironment();
    }
  
    setLevel(level: keyof LogLevel): void {
      this.level = LOG_LEVELS[level];
    }
  
    info(message: string, ...args: any[]): void {
      if (this.level >= LOG_LEVELS.INFO) {
        this.log('INFO', message, this.colors.blue, args);
      }
    }
  
    warn(message: string, ...args: any[]): void {
      if (this.level >= LOG_LEVELS.WARN) {
        this.log('WARN', message, this.colors.yellow, args);
      }
    }
  
    error(message: string, ...args: any[]): void {
      if (this.level >= LOG_LEVELS.ERROR) {
        this.log('ERROR', message, this.colors.red, args);
      }
    }
  
    debug(message: string, ...args: any[]): void {
      if (this.level >= LOG_LEVELS.DEBUG) {
        this.log('DEBUG', message, this.colors.gray, args);
      }
    }
  
    verbose(message: string, ...args: any[]): void {
      if (this.level >= LOG_LEVELS.VERBOSE) {
        this.log('VERBOSE', message, this.colors.magenta, args);
      }
    }
  
    success(message: string, ...args: any[]): void {
      if (this.level >= LOG_LEVELS.INFO) {
        this.log('SUCCESS', message, this.colors.green, args);
      }
    }
  
    /**
     * Log a step in a process
     */
    step(step: number, total: number, message: string): void {
      if (this.level >= LOG_LEVELS.INFO) {
        const progress = `[${step}/${total}]`;
        this.log('STEP', `${progress} ${message}`, this.colors.cyan);
      }
    }
  
    /**
     * Log progress with a percentage
     */
    progress(current: number, total: number, message: string): void {
      if (this.level >= LOG_LEVELS.INFO) {
        const percentage = Math.round((current / total) * 100);
        const progressBar = this.createProgressBar(percentage);
        this.log('PROGRESS', `${progressBar} ${percentage}% ${message}`, this.colors.cyan);
      }
    }
  
    /**
     * Create a timer that can be stopped to log elapsed time
     */
    timer(label: string): () => void {
      const start = Date.now();
      this.debug(`⏱️  Timer started: ${label}`);
      
      return () => {
        const elapsed = Date.now() - start;
        this.debug(`⏱️  Timer finished: ${label} (${elapsed}ms)`);
      };
    }
  
    /**
     * Log with a custom prefix/emoji
     */
    custom(prefix: string, message: string, color?: string, ...args: any[]): void {
      if (this.level >= LOG_LEVELS.INFO) {
        const colorFn = color ? this.getColorFunction(color) : this.colors.reset;
        this.log(prefix, message, colorFn, args);
      }
    }
  
    private log(level: string, message: string, colorFn: (text: string) => string, args: any[] = []): void {
      const timestamp = new Date().toISOString().substring(11, 23);
      const formattedLevel = level.padEnd(7);
      
      let output = `${this.colors.gray(timestamp)} ${colorFn(formattedLevel)} ${message}`;
      
      if (args.length > 0) {
        console.log(output, ...args);
      } else {
        console.log(output);
      }
    }
  
    private createProgressBar(percentage: number, width: number = 20): string {
      const filled = Math.round((percentage / 100) * width);
      const empty = width - filled;
      return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
    }
  
    private isTestEnvironment(): boolean {
      return typeof Deno !== 'undefined' && 
             (Deno.env.get('NODE_ENV') === 'test' || 
              Deno.args.some(arg => arg.includes('test')));
    }
  
    private getColorFunction(color: string): (text: string) => string {
      switch (color) {
        case 'red': return this.colors.red;
        case 'green': return this.colors.green;
        case 'blue': return this.colors.blue;
        case 'yellow': return this.colors.yellow;
        case 'magenta': return this.colors.magenta;
        case 'cyan': return this.colors.cyan;
        case 'gray': return this.colors.gray;
        default: return this.colors.reset;
      }
    }
  
    private get colors() {
      if (!this.enableColors) {
        const noColor = (text: string) => text;
        return {
          red: noColor,
          green: noColor,
          blue: noColor,
          yellow: noColor,
          magenta: noColor,
          cyan: noColor,
          gray: noColor,
          reset: noColor
        };
      }
  
      return {
        red: (text: string) => `\x1b[31m${text}\x1b[0m`,
        green: (text: string) => `\x1b[32m${text}\x1b[0m`,
        blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
        yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
        magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
        cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
        gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
        reset: (text: string) => text
      };
    }
  }
  
  /**
   * Create a logger instance for use in modules
   */
  export function createLogger(verbose: boolean = false): Logger {
    return new Logger(verbose);
  }
