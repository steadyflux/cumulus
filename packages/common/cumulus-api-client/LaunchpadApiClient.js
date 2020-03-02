'use strict';

const LaunchpadToken = require('../LaunchpadToken.js');
const CumulusApiClient = require('./CumulusApiClient');

class LaunchpadApiClient extends CumulusApiClient {
  /**
   * Sets required keys, calls superclass constructor
   * @param {Object} config - config object
   * @param {string} config.launchpadPassphrase  - Launchpad passphrase to use for auth
   * @param {string} config.launchpadApi         - URL of launchpad api to use for authorization
   * @param {string} config.launchpadCertificate - key of certificate object stores in the
   *                                          internal crypto bucket
   * @param {string} config.userGroup            - User group for use with launchpad oauth
   * @param {string} config.kmsId                - ID of the AWS KMS key used for
   *                                               cryption/decryption
   */
  constructor(config) {
    const requiredKeys = ['kmsId', 'userGroup', 'launchpadPassphrase', 'launchpadApi',
      'launchpadCertificate', 'tokenSecretName', 'authTokenTable', 'baseUrl'];
    super(config, requiredKeys);
    this.launchpadToken = new LaunchpadToken({
      passphrase: this.config.launchpadPassphrase,
      api: this.config.launchpadApi,
      certificate: this.config.launchpadCertificate
    });
  }

  /**
   * Overwrites base class validation method - launchpad verifiction
   * is based on a server call the API does by default, so
   * checking here results in potential duplicate calls.
   *
   * Rely on authRetry in the get method instead.
   *
   * @memberof LaunchpadApiClient
   *
   * @returns {boolean} true
   */
  async _validateTokenExpiry() {
    return true;
  }

  async refreshAuthToken(_token) {
    throw new this.Error('Token refresh is not supported for Launchpad auth');
  }

  async getTokenTimeLeft(token) {
    const validationResponse = await this.launchpadToken.validateToken(token);
    return Math.max(validationResponse.session_idleremaining,
      validationResponse.session_maxremaining);
  }

  /**
  * Get a bearer token from launchpad auth for use with the Cumulus API
  *   * @returns {string} - Bearer token used to authenticate with the Cumulus API
  */
  async createNewAuthToken() {
    const tokenResponse = await this.launchpadToken.requestToken();
    return tokenResponse.sm_token;
  }
}

module.exports = LaunchpadApiClient;
