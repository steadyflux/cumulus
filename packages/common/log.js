'use strict';

const { Logger } = require('@cumulus/json-logger');
const isNumber = require('lodash/isNumber');
const isString = require('lodash/isString');
const util = require('util');

function logger() {
  return new Logger({
    defaultFields: {
      asyncOperationId: process.env.ASYNCOPERATIONID,
      executions: process.env.EXECUTIONS,
      granules: process.env.GRANULES,
      parentArn: process.env.PARENTARN,
      sender: process.env.SENDER,
      stackName: process.env.STACKNAME,
      version: process.env.TASKVERSION
    }
  });
}

/**
 * Constructs JSON to log
 *
 * @param {string} additionalKeys - Any additional key value pairs the user chooses to log
 * @param {string} args - Message to log and any other information
 * @returns {undefined} - log is printed to stdout, nothing is returned
 */
function logAdditionalKeys(additionalKeys, ...args) {
  logger().info(util.format(...args), additionalKeys);
}

/**
 * Logs the message
 *
 * @param {string} args - Includes message and any other information to log
 */
function info(...args) {
  logger().info(util.format(...args));
}

/**
 * Logs the error
 *
 * @param {Object} args - Includes error and any other information to log
 */
function error(...args) {
  logger().error(util.format(...args));
}

function exception(theError, message, additionalFields) {
  logger().exception(theError, message, additionalFields);
}

/**
 * Logs the debugger messsages
 *
 * @param {Object} args - Includes debugger message and any other information to log
 */
function debug(...args) {
  logger().debug(util.format(...args));
}

/**
 * Logs the Warning messsage
 *
 * @param {Object} args - Includes Warn message and any other information to log
 */
function warn(...args) {
  logger().warn(util.format(...args));
}

/**
 * Logs the Fatal messsage
 *
 * @param {Object} args - Includes Fatal message and any other information to log
 */
function fatal(...args) {
  logger().fatal(util.format(...args));
}
/**
 * Logs the Trace messsage
 *
 * @param {Object} args - Includes Trace message and any other information to log
 */
function trace(...args) {
  logger().trace(util.format(...args));
}

/**
 * convert log level from string to number or number to string
 *
 * @param {string/number} level - log level in string or number
 * @returns {number/string} - level in number or string
 */
function convertLogLevel(level) {
  const mapping = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10
  };
  if (isString(level)) return mapping[level];
  if (isNumber(level)) return Object.keys(mapping).find((key) => mapping[key] === level);
  return undefined;
}

module.exports = {
  convertLogLevel,
  debug,
  error,
  exception,
  fatal,
  info,
  logAdditionalKeys: util.deprecate(logAdditionalKeys, '@cumulus/common/log.logAdditionalKeys() is deprecated after version 1.21.0 and will be removed in a future release.'),
  trace,
  warn
};
