import AWS = require('aws-sdk');
import { inTestMode, testAwsClient } from './test-utils';

/**
 * Does nothing.  Used where a callback is required but not used.
 *
 * @returns {undefined} undefined
 */
const noop = () => {}; // eslint-disable-line lodash/prefer-noop

const getRegion = () => process.env.AWS_REGION || 'us-east-1';

// Workaround upload hangs. See: https://github.com/andrewrk/node-s3-client/issues/74
// @ts-ignore
AWS.util.update(AWS.S3.prototype, { addExpect100Continue: noop });
AWS.config.setPromisesDependency(Promise);

const memoize = <T>(fn: (options?: object) => T): (options?: object) => T => {
  let memo: T;
  return (options) => {
    if (!memo) memo = fn(options);
    return memo;
  };
};

/**
 * Return a function which, when called, will return an AWS service object
 *
 * Note: The returned service objects are cached, so there will only be one
 *       instance of each service object per process.
 *
 * @param {Function} Service - an AWS service object constructor function
 * @param {string} version - the API version to use
 * @returns {Function} - a function which, when called, will return an AWS service object
 */
const awsClient = <T extends AWS.Service | AWS.DynamoDB.DocumentClient>(Service: new (params: object) => T, version?: string): (options?: object) => T => {
  const options: { region: string, apiVersion?: string } = {
    region: getRegion()
  };
  if (version) options.apiVersion = version;

  if (inTestMode()) {
    // @ts-ignore
    if (AWS.DynamoDB.DocumentClient.serviceIdentifier === undefined) {
      // @ts-ignore
      AWS.DynamoDB.DocumentClient.serviceIdentifier = 'dynamodb';
    }
    return memoize((o) => testAwsClient(Service, Object.assign(options, o)));
  }
  return memoize((o) => new Service(Object.assign(options, o)));
};

export = awsClient;
