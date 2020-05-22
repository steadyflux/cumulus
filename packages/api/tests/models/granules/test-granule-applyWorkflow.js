'use strict';

const test = require('ava');
const sinon = require('sinon');

// const awsServices = require('@cumulus/aws-client/services');
const Lambda = require('@cumulus/aws-client/Lambda');
const { randomString } = require('@cumulus/common/test-utils');
const { constructCollectionId } = require('@cumulus/message/Collections');

const Granule = require('../../../models/granules');
const Rule = require('../../../models/rules');

let lambdaStub;
test.before(async () => {
  process.env.GranulesTable = randomString();
  await new Granule().createTable();

  lambdaStub = sinon.stub(Lambda, 'invoke').resolves(true);
});

test('applyWorkflow accepts list of granules', async (t) => {
  const granulesModel = new Granule();
  // TODO: remove stub and use spy so we can inspect args
  const stub = sinon.stub(Rule, 'buildPayload').resolves({});
  t.teardown(() => stub.restore());
  await granulesModel.applyWorkflow(
    [{
      collectionId: constructCollectionId('test', '001'),
      provider: 'test-provider'
    }],
    'test-workflow'
  );
  t.is(lambdaStub.callCount, 1);
});
