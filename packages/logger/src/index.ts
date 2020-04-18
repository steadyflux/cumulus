/* eslint no-console: "off" */

import isError from 'lodash.iserror';
import util from 'util';

type Level = 'debug' | 'error' | 'fatal' | 'info' | 'trace' | 'warn'

type LoggerConstructorOptions = {
  asyncOperationId?: string,
  executions?: string,
  granules?: string,
  parentArn?: string,
  pretty: boolean,
  sender: string,
  stackName?: string,
  console?: Console,
  version?: string
}

class Logger {
  private asyncOperationId: string | undefined;
  private executions: string | undefined;
  private granules: string | undefined;
  private parentArn: string | undefined;
  private pretty: boolean;
  private sender: string;
  private stackName: string | undefined;
  private thisConsole: Console;
  private version: string | undefined;

  /**
   * @param {Object} options - options object
   * @param {string} [options.executions]  - AWS stepfunction execution name
   * @param {string} [options.granules] - stringified array of granule objects
   * @param {string} [options.parentArn] - parent stepfunction execution ARN
   * @param {boolean} [options.pretty=false] - stringify objects on multiple lines
   * @param {string} [options.sender="unknown"] - the sender of the log message
   * @param {string} [options.stackName] - cumulus stack name
   * @param {string} [options.asyncOperationId] - async operation id associated with the
   *  kickoff of the workflow (optional)
   * @param {Console} [options.console=global.console] - the console to write
   *   log events to
   * @param {string} [options.version] - Lambda function version
   */
  constructor(options: LoggerConstructorOptions) {
    this.asyncOperationId = options.asyncOperationId;
    this.executions = options.executions;
    this.granules = options.granules;
    this.parentArn = options.parentArn;
    this.pretty = options.pretty || false;
    this.sender = options.sender || 'unknown';
    this.stackName = options.stackName;
    this.thisConsole = options.console || global.console;
    this.version = options.version;
  }

  /**
   * Log a debug message
   *
   * @param {string} messageArgs - the message to log
   */
  debug(format: any, ...args: any[]) {
    this._writeLogEvent('debug', [format, ...args]);
  }

  /**
   * Log an error message
   *
   * @param {string} messageArgs - the message to log
   */
  error(format: any, ...args: any[]) {
    const messageArgs = [format, ...args];
    const lastMessageArg = messageArgs[messageArgs.length - 1];

    if (isError(lastMessageArg)) {
      const error = lastMessageArg;

      let actualMessageArgs: [any, ...any[]];
      if (args.length === 0) {
        actualMessageArgs = [error.message];
      } else {
        actualMessageArgs = [format, ...args.slice(0, args.length - 1)];
      }

      const additionalKeys: { error: { name: string, message: string, stack?: string[] }} = {
        error: {
          name: error.name,
          message: error.message
        }
      };
      if (error.stack) additionalKeys.error.stack = error.stack.split('\n');

      this._writeLogEvent('error', actualMessageArgs, additionalKeys);
    } else {
      this._writeLogEvent('error', [format, ...args]);
    }
  }

  /**
   * Log a fatal message
   *
   * @param {string} messageArgs - the message to log
   */
  fatal(format: any, ...args: any[]) {
    this._writeLogEvent('fatal', [format, ...args]);
  }

  /**
   * Log an info message
   *
   * @param {string} messageArgs - the message to log
   */
  info(format: any, ...args: any[]) {
    this._writeLogEvent('info', [format, ...args]);
  }

  /**
   * Log an event with additional properties
   *
   * @param {Object} additionalKeys
   * @param {...any} messageArgs
   */
  infoWithAdditionalKeys(additionalKeys: {}, format: any, ...args: any[]) {
    this._writeLogEvent('info', [format, ...args], additionalKeys);
  }

  /**
   * Log a trace message
   *
   * @param {string} messageArgs - the message to log
   */
  trace(format: any, ...args: any[]) {
    this._writeLogEvent('trace', [format, ...args]);
  }

  /**
   * Log a warning message
   *
   * @param {string} messageArgs - the message to log
   */
  warn(format: any, ...args: any[]) {
    this._writeLogEvent('warn', [format, ...args]);
  }

  _writeLogEvent(level: Level, messageArgs: [any, ...any[]], additionalKeys = {}) {
    let formattedMessage;
    if (typeof messageArgs[0] === 'undefined') formattedMessage = '';
    else formattedMessage = util.format(...messageArgs);

    const standardLogEvent = {
      asyncOperationId: this.asyncOperationId,
      executions: this.executions,
      granules: this.granules,
      level,
      message: formattedMessage,
      parentArn: this.parentArn,
      sender: this.sender,
      stackName: this.stackName,
      timestamp: (new Date()).toISOString(),
      version: this.version
    };

    const logEvent = {
      ...additionalKeys,
      ...standardLogEvent
    };

    const logEventString = this.pretty
      ? JSON.stringify(logEvent, null, 2)
      : JSON.stringify(logEvent);

    if (level === 'error') this.thisConsole.error(logEventString);
    else this.thisConsole.log(logEventString);
  }
}

export = Logger;
