'use strict';

const test = require('ava');
const sinon = require('sinon');

// const awsServices = require('@cumulus/aws-client/services');
const Lambda = require('@cumulus/aws-client/Lambda');
const { randomString } = require('@cumulus/common/test-utils');
const { constructCollectionId } = require('@cumulus/message/Collections');

const Granule = require('../../../models/granules');
const Rule = require('../../../models/rules');

test.before(async () => {
  process.env.GranulesTable = randomString();
  await new Granule().createTable();
});

test.beforeEach((t) => {
  t.context.lambdaStub = sinon.stub(Lambda, 'invoke').resolves(true);
});

test.afterEach.always((t) => {
  t.context.lambdaStub.restore();
});

test.serial('applyWorkflow accepts list of granules', async (t) => {
  const { lambdaStub } = t.context;
  const granulesModel = new Granule();
  const stub = sinon.stub(Rule, 'buildPayload').callsFake(
    (payload) => Promise.resolve(payload)
  );
  t.teardown(() => stub.restore());
  const granules = [{
    collectionId: constructCollectionId('test', '001'),
    provider: 'test-provider'
  }];
  await granulesModel.applyWorkflow(
    granules,
    'test-workflow'
  );
  t.is(lambdaStub.callCount, 1);
  t.deepEqual(lambdaStub.firstCall.lastArg.payload.granules, granules);
});

test.serial('applyWorkflow correctly maps input granules based on collection/provider', async (t) => {
  const { lambdaStub } = t.context;
  const granulesModel = new Granule();
  const stub = sinon.stub(Rule, 'buildPayload').callsFake(
    (payload) => Promise.resolve(payload)
  );
  t.teardown(() => stub.restore());

  const collection1 = constructCollectionId('foo', '001');
  const collection2 = constructCollectionId('bar', '001');
  const provider1 = 'test-provider';
  const provider2 = 'test2-provider';

  const granules = [{
    collectionId: collection1,
    provider: provider1
  }, {
    collectionId: collection1,
    provider: provider1
  }, {
    collectionId: collection1,
    provider: provider2
  }, {
    collectionId: collection2,
    provider: provider2
  }];
  await granulesModel.applyWorkflow(
    granules,
    'test-workflow'
  );
  t.is(lambdaStub.callCount, 3);
  t.deepEqual(lambdaStub.args[0][1].payload.granules, [granules[0], granules[1]]);
  t.deepEqual(lambdaStub.args[1][1].payload.granules, [granules[2]]);
  t.deepEqual(lambdaStub.args[2][1].payload.granules, [granules[3]]);
});
