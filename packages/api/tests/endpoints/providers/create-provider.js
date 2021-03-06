'use strict';

const test = require('ava');
const sinon = require('sinon');
const request = require('supertest');

const { s3 } = require('@cumulus/aws-client/services');
const {
  recursivelyDeleteS3Bucket
} = require('@cumulus/aws-client/S3');
const { randomString } = require('@cumulus/common/test-utils');
const { RecordDoesNotExist } = require('@cumulus/errors');

const bootstrap = require('../../../lambdas/bootstrap');
const AccessToken = require('../../../models/access-tokens');
const Provider = require('../../../models/providers');
const {
  createFakeJwtAuthToken,
  fakeProviderFactory,
  setAuthorizedOAuthUsers
} = require('../../../lib/testUtils');
const { Search } = require('../../../es/search');
const assertions = require('../../../lib/assertions');

process.env.AccessTokensTable = randomString();
process.env.ProvidersTable = randomString();
process.env.stackName = randomString();
process.env.system_bucket = randomString();
process.env.TOKEN_SECRET = randomString();

// import the express app after setting the env variables
const { app } = require('../../../app');

let providerModel;
const esIndex = randomString();
let esClient;

let jwtAuthToken;
let accessTokenModel;

const providerDoesNotExist = async (t, providerId) => {
  await t.throwsAsync(
    () => providerModel.get({ id: providerId }),
    { instanceOf: RecordDoesNotExist }
  );
};

test.before(async () => {
  await s3().createBucket({ Bucket: process.env.system_bucket }).promise();

  const esAlias = randomString();
  process.env.ES_INDEX = esAlias;
  await bootstrap.bootstrapElasticSearch('fakehost', esIndex, esAlias);

  providerModel = new Provider();
  await providerModel.createTable();

  const username = randomString();
  await setAuthorizedOAuthUsers([username]);

  accessTokenModel = new AccessToken();
  await accessTokenModel.createTable();

  jwtAuthToken = await createFakeJwtAuthToken({ accessTokenModel, username });

  esClient = await Search.es('fakehost');
});

test.after.always(async () => {
  await recursivelyDeleteS3Bucket(process.env.system_bucket);
  await providerModel.deleteTable();
  await accessTokenModel.deleteTable();
  await esClient.indices.delete({ index: esIndex });
});

test('CUMULUS-911 POST without an Authorization header returns an Authorization Missing response', async (t) => {
  const newProvider = fakeProviderFactory();

  const response = await request(app)
    .post('/providers')
    .send(newProvider)
    .set('Accept', 'application/json')
    .expect(401);

  assertions.isAuthorizationMissingResponse(t, response);
  await providerDoesNotExist(t, newProvider.id);
});

test('CUMULUS-912 POST with an invalid access token returns an unauthorized response', async (t) => {
  const newProvider = fakeProviderFactory();
  const response = await request(app)
    .post('/providers')
    .send(newProvider)
    .set('Accept', 'application/json')
    .set('Authorization', 'Bearer ThisIsAnInvalidAuthorizationToken')
    .expect(401);

  assertions.isInvalidAccessTokenResponse(t, response);
  await providerDoesNotExist(t, newProvider.id);
});

test.todo('CUMULUS-912 POST with an unauthorized user returns an unauthorized response');

test('POST with invalid authorization scheme returns an invalid authorization response', async (t) => {
  const newProvider = fakeProviderFactory();

  const response = await request(app)
    .post('/providers')
    .send(newProvider)
    .set('Accept', 'application/json')
    .set('Authorization', 'InvalidBearerScheme ThisIsAnInvalidAuthorizationToken')
    .expect(401);

  assertions.isInvalidAuthorizationResponse(t, response);
  await providerDoesNotExist(t, newProvider.id);
});

test('POST creates a new provider', async (t) => {
  const newProviderId = 'AQUA';
  const newProvider = fakeProviderFactory({
    id: newProviderId
  });

  const response = await request(app)
    .post('/providers')
    .send(newProvider)
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${jwtAuthToken}`)
    .expect(200);

  const { message, record } = response.body;
  t.is(message, 'Record saved');
  t.is(record.id, newProviderId);
});

test('POST returns a 409 error if the provider already exists', async (t) => {
  const newProvider = fakeProviderFactory();

  await providerModel.create(newProvider);

  const response = await request(app)
    .post('/providers')
    .send(newProvider)
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${jwtAuthToken}`)
    .expect(409);

  const { message } = response.body;
  t.is(message, (`A record already exists for ${newProvider.id}`));
});

test.serial('POST returns a 500 response if record creation throws unexpected error', async (t) => {
  const stub = sinon.stub(Provider.prototype, 'create')
    .callsFake(() => {
      throw new Error('unexpected error');
    });

  const newProvider = fakeProviderFactory();

  try {
    const response = await request(app)
      .post('/providers')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwtAuthToken}`)
      .send(newProvider)
      .expect(500);
    t.is(response.status, 500);
  } finally {
    stub.restore();
  }
});

test('POST returns a 400 response if invalid record is provided', async (t) => {
  const newProvider = fakeProviderFactory();
  delete newProvider.host;

  const response = await request(app)
    .post('/providers')
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${jwtAuthToken}`)
    .send(newProvider)
    .expect(400);
  t.is(response.status, 400);
});

test('POST returns a 400 response if invalid hostname is provided', async (t) => {
  const newProvider = fakeProviderFactory({
    host: '-bad-hostname'
  });

  const response = await request(app)
    .post('/providers')
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${jwtAuthToken}`)
    .send(newProvider)
    .expect(400);
  t.is(response.status, 400);
});
