const test = require('ava');
const cryptoRandomString = require('crypto-random-string');
const sinon = require('sinon');

const granules = require('@cumulus/api-client/granules');

const { deleteGranules } = require('..');

const randomId = (prefix) => `${prefix}${cryptoRandomString({ length: 10 })}`;

let deleteGranuleStub;
test.before(() => {
  process.env.stackName = randomId('stack');
  deleteGranuleStub = sinon.stub(granules, 'deleteGranule').resolves(true);
});

test.afterEach.always(() => {
  deleteGranuleStub.resetHistory();
});

test.after.always(() => {
  delete process.env.stackName;
  deleteGranuleStub.restore();
});

test.serial('when there are no granules, nothing happens', async (t) => {
  await deleteGranules({
    input: {
      granules: []
    }
  });
  t.false(deleteGranuleStub.called);
});

test.serial('granules are deleted', async (t) => {
  const granule1 = {
    granuleId: randomId('granule')
  };
  const granule2 = {
    granuleId: randomId('granule')
  };
  await deleteGranules({
    input: {
      granules: [granule1, granule2]
    }
  });
  t.is(deleteGranuleStub.callCount, 2);
  t.deepEqual(deleteGranuleStub.firstCall.args[0], {
    prefix: process.env.stackName,
    granuleId: granule1.granuleId
  });
  t.deepEqual(deleteGranuleStub.args[1][0], {
    prefix: process.env.stackName,
    granuleId: granule2.granuleId
  });
});
