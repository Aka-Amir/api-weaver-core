import { ILogger } from "./types/logger.type";

export class Logger {
  private static _instance: Logger;
  private logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger ?? console;
  }

  static log(message?: any, ...optionalParams: any[]): void {
    this._instance.logger?.log(message, ...optionalParams);
  }

  static error(message?: any, ...optionalParams: any[]): void {
    this._instance.logger?.error(message, ...optionalParams);
  }

  static warn(message?: any, ...optionalParams: any[]): void {
    this._instance.logger?.warn(message, ...optionalParams);
  }
}
