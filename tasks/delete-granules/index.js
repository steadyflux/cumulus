'use strict';

const pMap = require('p-map');
const granules = require('@cumulus/api-client/granules');
const cumulusMessageAdapter = require('@cumulus/cumulus-message-adapter-js');

/**
 * Delete granules
 *
 * @param {Object} event - contains input and config parameters
 * @returns {Promise}
 */
const deleteGranules = (event) => {
  const input = event.input;
  return pMap(
    input.granules,
    ({ granuleId }) => granules.deleteGranule({
      prefix: process.env.stackName,
      granuleId
    }),
    { concurrency: 10 }
  );
};

/**
 * Lambda handler
 *
 * @param {Object} event      - a Cumulus Message
 * @param {Object} context    - an AWS Lambda context
 * @returns {Promise<Object>} - Returns output from task.
 *                              See schemas/output.json for detailed output schema
 */
const handler = async (event, context) =>
  cumulusMessageAdapter.runCumulusTask(
    deleteGranules,
    event,
    context
  );

module.exports = {
  deleteGranules,
  handler
};
