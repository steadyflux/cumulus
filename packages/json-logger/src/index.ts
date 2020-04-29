import { EOL } from 'os';

type Fields = { [key: string]: any };

type LogLevel = 'debug' | 'error' | 'fatal' | 'info' | 'trace' | 'warn';

interface LoggerConsole {
  log: (message: string) => void
}

type LoggerOptions = {
  defaultFields?: Fields,
  console?: LoggerConsole,
  pretty?: boolean
};

/**
 * A class to write JSON-formatted log events
 */
export class Logger {
  private defaultFields: Fields;
  private console: LoggerConsole;
  private pretty: boolean;

  /**
   * @param {Object} [params={}]
   * @param {Object} [params.defaultFields={}] - default fields to be set on all log events
   * @param {Console} [params.console=global.console] - the console to use for output
   * @param {boolean} [params.pretty=false] - pretty-print JSON
   */
  constructor(params: LoggerOptions = {}) {
    this.defaultFields = params.defaultFields || {};
    this.console = params.console || global.console;
    this.pretty = params.pretty || false;
  }

  /**
   * Set a field on all log events
   *
   * @param {string} name
   * @param {any} value
   */
  setDefaultField(name: string, value: any) {
    this.defaultFields[name] = value;
  }

  /**
   * Write out a log event with level=debug
   *
   * @param {string} message
   * @param {Object} [additionalFields={}] - fields to log in addition to the defaults
   */
  debug(message: string, additionalFields: Fields = {}) {
    this.write('debug', message, additionalFields);
  }

  /**
   * Write out a log event with level=error
   *
   * @param {string} message
   * @param {Object} [additionalFields={}] - fields to log in addition to the defaults
   */
  error(message: string, additionalFields: Fields = {}) {
    this.write('error', message, additionalFields);
  }

  /**
   * Write out a log event with level=fatal
   *
   * @param {string} message
   * @param {Object} [additionalFields={}] - fields to log in addition to the defaults
   */
  fatal(message: string, additionalFields: Fields = {}) {
    this.write('fatal', message, additionalFields);
  }

  /**
   * Log an exception with level=error
   *
   * In addition to the usual fields, this log event will contain `error.message`, `error.name`, and
   * `error.stack` if the exception had a stack set.
   *
   * @param {Error} error - an exception to be logged
   * @param {string} [message=error.message] - the message, defaults to the value of `error.message`
   * @param {Object} [additionalFields={}] - fields to log in addition to the defaults
   */
  exception(error: Error, message?: string, additionalFields: Fields = {}) {
    const errorField: { message: string, name: string, stack?: string[] } = {
      name: error.name,
      message: error.message
    };

    if (error.stack) {
      errorField.stack = error.stack.split(EOL);
    }

    this.error(
      message || error.message,
      {
        ...additionalFields,
        error: errorField
      }
    );
  }

  /**
   * Write out a log event with level=info
   *
   * @param {string} message
   * @param {Object} [additionalFields={}] - fields to log in addition to the defaults
   */
  info(message: string, additionalFields: Fields = {}) {
    this.write('info', message, additionalFields);
  }

  /**
   * Write out a log event with level=trace
   *
   * @param {string} message
   * @param {Object} [additionalFields={}] - fields to log in addition to the defaults
   */
  trace(message: string, additionalFields: Fields = {}) {
    this.write('trace', message, additionalFields);
  }

  /**
   * Write out a log event with level=warn
   *
   * @param {string} message
   * @param {Object} [additionalFields={}] - fields to log in addition to the defaults
   */
  warn(message: string, additionalFields: Fields = {}) {
    this.write('warn', message, additionalFields);
  }

  private write(level: LogLevel, message: string, additionalFields: Fields = {}) {
    const logEvent = {
      ...this.defaultFields,
      ...additionalFields,
      level,
      message,
      timestamp: (new Date()).toISOString()
    };

    let messageString;
    if (this.pretty) messageString = JSON.stringify(logEvent, null, 2);
    else messageString = JSON.stringify(logEvent);

    this.console.log(messageString);
  }
}

export default Logger;
