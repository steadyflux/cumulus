'use strict';

const nock = require('nock');
const test = require('ava');
const moment = require('moment');
const { URL, URLSearchParams } = require('url');

const EarthdataLogin = require('../../lib/EarthdataLogin');
const OAuth2AuthenticationError = require('../../lib/OAuth2AuthenticationError');
const OAuth2AuthenticationFailure = require('../../lib/OAuth2AuthenticationFailure');
const { EarthdataLoginError } = require('../../lib/errors');

test.before(() => {
  nock.disableNetConnect();
});

test.beforeEach(() => {
  nock.cleanAll();
});

test('The EarthdataLogin constructor throws a TypeError if clientId is not specified', (t) => {
  const err = t.throws(() => {
    new EarthdataLogin({
      clientPassword: 'client-password',
      earthdataLoginUrl: 'http://www.example.com',
      redirectUri: 'http://www.example.com/cb'
    });
  },
  { instanceOf: TypeError });

  t.is(err.message, 'clientId is required');
});

test('The EarthdataLogin constructor throws a TypeError if clientPassword is not specified', (t) => {
  const err = t.throws(() => {
    new EarthdataLogin({
      clientId: 'client-id',
      earthdataLoginUrl: 'http://www.example.com',
      redirectUri: 'http://www.example.com/cb'
    });
  },
  { instanceOf: TypeError });

  t.is(err.message, 'clientPassword is required');
});

test('The EarthdataLogin constructor throws a TypeError if earthdataLoginUrl is not specified', (t) => {
  const err = t.throws(() => {
    new EarthdataLogin({
      clientId: 'client-id',
      clientPassword: 'client-password',
      redirectUri: 'http://www.example.com/cb'
    });
  },
  { instanceOf: TypeError });

  t.is(err.message, 'earthdataLoginUrl is required');
});

test('The EarthdataLogin constructor throws a TypeError if earthdataLoginUrl is not a valid URL', (t) => {
  t.throws(() => {
    new EarthdataLogin({
      clientId: 'client-id',
      clientPassword: 'client-password',
      earthdataLoginUrl: 'asdf',
      redirectUri: 'http://www.example.com/cb'
    });
  },
  { instanceOf: TypeError });
});

test('The EarthdataLogin constructor throws a TypeError if redirectUri is not specified', (t) => {
  const err = t.throws(() => {
    new EarthdataLogin({
      clientId: 'client-id',
      clientPassword: 'client-password',
      earthdataLoginUrl: 'http://www.example.com'
    });
  },
  { instanceOf: TypeError });

  t.is(err.message, 'redirectUri is required');
});

test('The EarthdataLogin constructor throws a TypeError if redirectUri is not a valid URL', (t) => {
  t.throws(() => {
    new EarthdataLogin({
      clientId: 'client-id',
      clientPassword: 'client-password',
      earthdataLoginUrl: 'http://www.example.com',
      redirectUri: 'asdf'
    });
  },
  { instanceOf: TypeError });
});

test('EarthdataLogin.getAuthorizationUrl() returns the correct URL when no state is specified', (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const authorizationUrl = earthdataLogin.getAuthorizationUrl();
  const parsedAuthorizationUrl = new URL(authorizationUrl);

  t.is(parsedAuthorizationUrl.origin, 'http://www.example.com');
  t.is(parsedAuthorizationUrl.pathname, '/oauth/authorize');
  t.is(parsedAuthorizationUrl.searchParams.get('response_type'), 'code');
  t.is(parsedAuthorizationUrl.searchParams.get('client_id'), 'client-id');
  t.is(parsedAuthorizationUrl.searchParams.get('redirect_uri'), 'http://www.example.com/cb');
  t.false(parsedAuthorizationUrl.searchParams.has('state'));
});

test('EarthdataLogin.getAuthorizationUrl() returns the correct URL when a state is specified', (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const authorizationUrl = earthdataLogin.getAuthorizationUrl('the-state');
  const parsedAuthorizationUrl = new URL(authorizationUrl);

  t.is(parsedAuthorizationUrl.origin, 'http://www.example.com');
  t.is(parsedAuthorizationUrl.pathname, '/oauth/authorize');
  t.is(parsedAuthorizationUrl.searchParams.get('response_type'), 'code');
  t.is(parsedAuthorizationUrl.searchParams.get('client_id'), 'client-id');
  t.is(parsedAuthorizationUrl.searchParams.get('redirect_uri'), 'http://www.example.com/cb');
  t.is(parsedAuthorizationUrl.searchParams.get('state'), 'the-state');
});

test('EarthdataLogin.getAccessToken() throws a TypeError if authorizationCode is not set', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  await t.throwsAsync(
    () => earthdataLogin.getAccessToken(),
    {
      instanceOf: TypeError,
      message: 'authorizationCode is required'
    }
  );
});

test.serial('EarthdataLogin.getAccessToken() sends a correct request to the token endpoint', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const tokenRequest = nock(
    'http://www.example.com',
    {
      reqHeaders: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }
  )
    .post(
      '/oauth/token',
      (body) => {
        const parsedBody = new URLSearchParams(body);

        return parsedBody.get('grant_type') === 'authorization_code'
          && parsedBody.get('code') === 'authorization-code'
          && parsedBody.get('redirect_uri') === 'http://www.example.com/cb';
      }
    )
    .basicAuth({
      user: 'client-id',
      pass: 'client-password'
    })
    .reply(
      200,
      {
        access_token: 'access-token',
        token_type: 'bearer',
        expires_in: 123,
        refresh_token: 'refresh-token',
        endpoint: '/api/users/sidney'
      }
    );

  await earthdataLogin.getAccessToken('authorization-code');

  t.true(tokenRequest.isDone());
});

test.serial('EarthdataLogin.getAccessToken() returns token information for a valid authorizationCode', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const tokenRequest = nock('http://www.example.com')
    .post('/oauth/token')
    .reply(
      200,
      {
        access_token: 'access-token',
        token_type: 'bearer',
        expires_in: 100,
        refresh_token: 'refresh-token',
        endpoint: '/api/users/sidney'
      }
    );

  const requestStartTime = moment().unix();
  const {
    accessToken,
    refreshToken,
    expirationTime,
    username
  } = await earthdataLogin.getAccessToken('authorization-code');
  const requestEndTime = moment().unix();

  t.true(tokenRequest.isDone());

  t.is(accessToken, 'access-token');
  t.is(refreshToken, 'refresh-token');
  t.true(expirationTime >= requestStartTime + 100);
  t.true(expirationTime <= requestEndTime + 100);
  t.is(username, 'sidney');
});

test.serial('EarthdataLogin.getAccessToken() throws an OAuth2AuthenticationFailure error for an invalid authorizationCode', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const tokenRequest = nock('http://www.example.com')
    .post('/oauth/token')
    .reply(400);

  await t.throwsAsync(
    () => earthdataLogin.getAccessToken('authorization-code'),
    { instanceOf: OAuth2AuthenticationFailure }
  );

  t.true(tokenRequest.isDone());
});

test.serial('EarthdataLogin.getAccessToken() throws an OAuth2AuthenticationError error if there is a problem with the Earthdata Login service', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const tokenRequest = nock('http://www.example.com')
    .post('/oauth/token')
    .reply(500);

  await t.throwsAsync(
    () => earthdataLogin.getAccessToken('authorization-code'),
    { instanceOf: OAuth2AuthenticationError }
  );

  t.true(tokenRequest.isDone());
});

test('EarthdataLogin.refreshAccessToken() throws a TypeError if refreshToken is not set', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  await t.throwsAsync(
    () => earthdataLogin.refreshAccessToken(),
    {
      instanceOf: TypeError,
      message: 'refreshToken is required'
    }
  );
});

test.serial('EarthdataLogin.refreshAccessToken() sends a correct request to the token endpoint', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const tokenRequest = nock(
    'http://www.example.com',
    {
      reqHeaders: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    }
  )
    .post(
      '/oauth/token',
      (body) => {
        const parsedBody = new URLSearchParams(body);

        return parsedBody.get('grant_type') === 'refresh_token'
          && parsedBody.get('refresh_token') === 'refresh-token';
      }
    )
    .basicAuth({
      user: 'client-id',
      pass: 'client-password'
    })
    .reply(
      200,
      {
        access_token: 'access-token',
        token_type: 'bearer',
        expires_in: 123,
        refresh_token: 'refresh-token',
        endpoint: '/api/users/sidney'
      }
    );

  await earthdataLogin.refreshAccessToken('refresh-token');

  t.true(tokenRequest.isDone());
});

test.serial('EarthdataLogin.refreshAccessToken() returns token information for a valid refreshToken', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const tokenRequest = nock('http://www.example.com')
    .post('/oauth/token')
    .reply(
      200,
      {
        access_token: 'access-token',
        token_type: 'bearer',
        expires_in: 100,
        refresh_token: 'refresh-token',
        endpoint: '/api/users/sidney'
      }
    );

  const requestStartTime = moment().unix();
  const {
    accessToken,
    refreshToken,
    expirationTime,
    username
  } = await earthdataLogin.refreshAccessToken('refresh-token');
  const requestEndTime = moment().unix();

  t.true(tokenRequest.isDone());

  t.is(accessToken, 'access-token');
  t.is(refreshToken, 'refresh-token');
  t.true(expirationTime >= requestStartTime + 100);
  t.true(expirationTime <= requestEndTime + 100);
  t.is(username, 'sidney');
});

test.serial('EarthdataLogin.refreshAccessToken() throws an OAuth2AuthenticationFailure error for an invalid refreshToken', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const tokenRequest = nock('http://www.example.com')
    .post('/oauth/token')
    .reply(400);

  await t.throwsAsync(
    () => earthdataLogin.refreshAccessToken('invalid-refresh-token'),
    { instanceOf: OAuth2AuthenticationFailure }
  );

  t.true(tokenRequest.isDone());
});

test.serial('EarthdataLogin.refreshAccessToken() throws an OAuth2AuthenticationError error if there is a problem with the Earthdata Login service', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const tokenRequest = nock('http://www.example.com')
    .post('/oauth/token')
    .reply(500);

  await t.throwsAsync(
    () => earthdataLogin.refreshAccessToken('refresh-token'),
    { instanceOf: OAuth2AuthenticationError }
  );

  t.true(tokenRequest.isDone());
});

test.serial('EarthdataLogin.getTokenUsername() returns the username associated with a valid token', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const token = 'token';
  const onBehalfOf = 'on-behalf-of';

  nock('http://www.example.com')
    .post(
      '/oauth/tokens/user',
      {
        token,
        client_id: 'client-id',
        on_behalf_of: onBehalfOf
      }
    )
    .basicAuth({ user: 'client-id', pass: 'client-password' })
    .reply(
      200,
      {
        uid: 'valid-username'
      }
    );

  const username = await earthdataLogin.getTokenUsername({
    token,
    onBehalfOf
  });

  t.is(username, 'valid-username');
});

test.serial('EarthdataLogin.getTokenUsername() throws an exception for an invalid token', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const token = 'token';
  const onBehalfOf = 'on-behalf-of';

  nock('http://www.example.com')
    .post(
      '/oauth/tokens/user',
      {
        token,
        client_id: 'client-id',
        on_behalf_of: onBehalfOf
      }
    )
    .basicAuth({ user: 'client-id', pass: 'client-password' })
    .reply(
      403,
      {
        error: 'invalid_token',
        error_description: 'The token is either malformed or does not exist'
      }
    );

  const error = await t.throwsAsync(
    earthdataLogin.getTokenUsername({
      token,
      onBehalfOf
    }),
    { instanceOf: EarthdataLoginError }
  );

  t.is(error.code, 'InvalidToken');
});

test.serial('EarthdataLogin.getTokenUsername() throws an exception for an expired token', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const token = 'token';
  const onBehalfOf = 'on-behalf-of';

  nock('http://www.example.com')
    .post(
      '/oauth/tokens/user',
      {
        token,
        client_id: 'client-id',
        on_behalf_of: onBehalfOf
      }
    )
    .basicAuth({ user: 'client-id', pass: 'client-password' })
    .reply(
      403,
      {
        error: 'token_expired',
        error_description: 'The token has expired'
      }
    );

  const error = await t.throwsAsync(
    earthdataLogin.getTokenUsername({
      token,
      onBehalfOf
    }),
    { instanceOf: EarthdataLoginError }
  );

  t.is(error.code, 'TokenExpired');
});

test.serial('EarthdataLogin.getTokenUsername() throws an exception if EarthdataLogin returns 200 with invalid JSON', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const token = 'token';
  const onBehalfOf = 'on-behalf-of';

  nock('http://www.example.com')
    .post(
      '/oauth/tokens/user',
      {
        token,
        client_id: 'client-id',
        on_behalf_of: onBehalfOf
      }
    )
    .basicAuth({ user: 'client-id', pass: 'client-password' })
    .reply(
      200,
      'asdf'
    );

  const error = await t.throwsAsync(
    earthdataLogin.getTokenUsername({
      token,
      onBehalfOf
    }),
    { instanceOf: EarthdataLoginError }
  );

  t.is(error.code, 'InvalidResponse');
});

test.serial('EarthdataLogin.getTokenUsername() throws an exception if EarthdataLogin returns 403 with invalid JSON', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const token = 'token';
  const onBehalfOf = 'on-behalf-of';

  nock('http://www.example.com')
    .post(
      '/oauth/tokens/user',
      {
        token,
        client_id: 'client-id',
        on_behalf_of: onBehalfOf
      }
    )
    .basicAuth({ user: 'client-id', pass: 'client-password' })
    .reply(
      403,
      'asdf'
    );

  const error = await t.throwsAsync(
    earthdataLogin.getTokenUsername({
      token,
      onBehalfOf
    }),
    { instanceOf: EarthdataLoginError }
  );

  t.is(error.code, 'InvalidResponse');
});

test.serial('EarthdataLogin.getTokenUsername() throws an exception if EarthdataLogin returns an unexpected error', async (t) => {
  const earthdataLogin = new EarthdataLogin({
    clientId: 'client-id',
    clientPassword: 'client-password',
    earthdataLoginUrl: 'http://www.example.com',
    redirectUri: 'http://www.example.com/cb'
  });

  const token = 'token';
  const onBehalfOf = 'on-behalf-of';

  nock('http://www.example.com')
    .post(
      '/oauth/tokens/user',
      {
        token,
        client_id: 'client-id',
        on_behalf_of: onBehalfOf
      }
    )
    .basicAuth({ user: 'client-id', pass: 'client-password' })
    .reply(
      403,
      {
        error: 'something_unexpected',
        error_description: 'Something unexpected'
      }
    );

  const error = await t.throwsAsync(
    earthdataLogin.getTokenUsername({
      token,
      onBehalfOf
    }),
    { instanceOf: EarthdataLoginError }
  );

  t.is(error.code, 'UnexpectedResponse');
});
