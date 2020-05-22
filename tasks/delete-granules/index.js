'use strict';

const { deleteGranule } = require('@cumulus/api-client/granules');
const cumulusMessageAdapter = require('@cumulus/cumulus-message-adapter-js');

/**
 * Delete granules
 *
 * @param {Object} event - contains input and config parameters
 * @returns {Promise}
 */
const deleteGranules = (event) => {
  const input = event.input;
  return Promise.all(input.granules.map(
    ({ granuleId }) => deleteGranule({
      prefix: process.env.STACKNAME,
      granuleId
    })
  ));
};

/**
 * Lambda handler
 *
 * @param {Object} event      - a Cumulus Message
 * @param {Object} context    - an AWS Lambda context
 * @returns {Promise<Object>} - Returns output from task.
 *                              See schemas/output.json for detailed output schema
 */
const handler = (event, context) =>
  cumulusMessageAdapter.runCumulusTask(
    deleteGranules,
    event,
    context
  );

module.exports = {
  handler
};
