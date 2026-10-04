import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { createApp } from '../index';
import {
  MemoryLtiStore,
  type LtiIdTokenClaims,
} from '../services/ltiStore';

const DEPLOY = {
  iss: 'https://lms.example.edu',
  clientId: 'unitutor-tool',
  deploymentId: 'deploy-1',
  authLoginUrl: 'https://lms.example.edu/api/lti/authorize_redirect',
  jwksUrl: 'https://lms.example.edu/api/lti/security/jwks',
  frontendOrigin: 'https://app.example.test',
};

const DEPLOYMENT_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id';
const MESSAGE_TYPE_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/message_type';
const VERSION_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/version';
const RESOURCE_LINK_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/resource_link';

function seedStore(): MemoryLtiStore {
  const store = new MemoryLtiStore();
  store.seedDeployment(DEPLOY);
  store.seedResourceCourse({
    iss: DEPLOY.iss,
    clientId: DEPLOY.clientId,
    deploymentId: DEPLOY.deploymentId,
    resourceLinkId: 'res-cs50p',
    courseId: 'cs50p-2022-lecture-0',
  });
  return store;
}

function validClaims(overrides: Partial<LtiIdTokenClaims> = {}): LtiIdTokenClaims {
  return {
    iss: DEPLOY.iss,
    aud: DEPLOY.clientId,
    sub: 'learner-42',
    nonce: 'nonce-abc',
    deploymentId: DEPLOY.deploymentId,
    messageType: 'LtiResourceLinkRequest',
    version: '1.3.0',
    resourceLinkId: 'res-cs50p',
    ...overrides,
  };
}

describe('GET /lti/oidc/login', () => {
  it('redirects to Platform auth URL with state and nonce', async () => {
    const store = seedStore();
    const app = createApp({ ltiStore: store });
    const url = new URL('https://tool.example/lti/oidc/login');
    url.searchParams.set('iss', DEPLOY.iss);
    url.searchParams.set('client_id', DEPLOY.clientId);
    url.searchParams.set('login_hint', 'hint-1');
    url.searchParams.set('target_link_uri', 'https://tool.example/lti/launch');
    url.searchParams.set('lti_message_hint', 'msg-1');
    url.searchParams.set('lti_deployment_id', DEPLOY.deploymentId);

    const res = await app.request(url.toString());
    expect(res.status).toBe(302);
    const loc = res.headers.get('Location');
    expect(loc).toBeTruthy();
    const redirect = new URL(loc!);
    expect(redirect.origin + redirect.pathname).toBe(DEPLOY.authLoginUrl);
    expect(redirect.searchParams.get('client_id')).toBe(DEPLOY.clientId);
    expect(redirect.searchParams.get('login_hint')).toBe('hint-1');
    expect(redirect.searchParams.get('nonce')).toBeTruthy();
    expect(redirect.searchParams.get('state')).toBeTruthy();
    expect(redirect.searchParams.get('redirect_uri')).toBe(
      'https://tool.example/lti/launch',
    );
  });

  it('returns 404 when deployment is unknown', async () => {
    const app = createApp({ ltiStore: new MemoryLtiStore() });
    const res = await app.request(
      '/lti/oidc/login?iss=https://x&client_id=y&lti_deployment_id=z&login_hint=h&target_link_uri=https://t/lti/launch',
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: 'unknown_deployment' });
  });
});

describe('POST /lti/launch', () => {
  it('upserts LtiLearner in store and redirects to course canvas', async () => {
    const store = seedStore();
    const claims = validClaims();
    const app = createApp({
      ltiStore: store,
      verifyIdToken: async () => claims,
    });

    const state = store.putLoginStateSync({
      nonce: claims.nonce,
      iss: DEPLOY.iss,
      clientId: DEPLOY.clientId,
      deploymentId: DEPLOY.deploymentId,
    });

    const res = await app.request('/lti/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: 'mock.jwt.token',
        state,
      }).toString(),
    });

    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get('Location')!);
    expect(loc.origin).toBe(DEPLOY.frontendOrigin);
    expect(loc.searchParams.get('courseId')).toBe('cs50p-2022-lecture-0');
    const learnerId = loc.searchParams.get('ltiLearnerId');
    expect(learnerId).toBeTruthy();

    const learner = store.getLearnerById(learnerId!);
    expect(learner).toMatchObject({
      iss: DEPLOY.iss,
      clientId: DEPLOY.clientId,
      deploymentId: DEPLOY.deploymentId,
      subject: 'learner-42',
    });
  });

  it('default JWKS path accepts signed id_token and rejects unsigned', async () => {
    const store = seedStore();
    const { publicKey, privateKey } = await generateKeyPair('RS256', {
      extractable: true,
    });
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'platform-1';
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ keys: [jwk] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const claims = validClaims();
    const signed = await new SignJWT({
      iss: claims.iss,
      aud: claims.aud,
      sub: claims.sub,
      nonce: claims.nonce,
      [DEPLOYMENT_CLAIM]: claims.deploymentId,
      [MESSAGE_TYPE_CLAIM]: claims.messageType,
      [VERSION_CLAIM]: claims.version,
      [RESOURCE_LINK_CLAIM]: { id: claims.resourceLinkId },
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-1', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const app = createApp({ ltiStore: store });
    const state = store.putLoginStateSync({
      nonce: claims.nonce,
      iss: DEPLOY.iss,
      clientId: DEPLOY.clientId,
      deploymentId: DEPLOY.deploymentId,
    });

    const ok = await app.request('/lti/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: signed, state }).toString(),
    });
    expect(ok.status).toBe(302);
    expect(new URL(ok.headers.get('Location')!).searchParams.get('courseId')).toBe(
      'cs50p-2022-lecture-0',
    );

    const state2 = store.putLoginStateSync({
      nonce: 'nonce-2',
      iss: DEPLOY.iss,
      clientId: DEPLOY.clientId,
      deploymentId: DEPLOY.deploymentId,
    });
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: claims.iss,
        aud: claims.aud,
        sub: 'forged',
        nonce: 'nonce-2',
        [DEPLOYMENT_CLAIM]: claims.deploymentId,
        [MESSAGE_TYPE_CLAIM]: claims.messageType,
        [VERSION_CLAIM]: claims.version,
        [RESOURCE_LINK_CLAIM]: { id: claims.resourceLinkId },
      }),
    ).toString('base64url');
    const forged = await app.request('/lti/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: `${header}.${payload}.`,
        state: state2,
      }).toString(),
    });
    expect(forged.status).toBe(401);
    await expect(forged.json()).resolves.toMatchObject({ error: 'invalid_token' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects wrong audience with 401', async () => {
    const store = seedStore();
    const app = createApp({
      ltiStore: store,
      verifyIdToken: async () => validClaims({ aud: 'other-tool' }),
    });
    const state = store.putLoginStateSync({
      nonce: 'nonce-abc',
      iss: DEPLOY.iss,
      clientId: DEPLOY.clientId,
      deploymentId: DEPLOY.deploymentId,
    });
    const res = await app.request('/lti/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: 'x', state }).toString(),
    });
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'invalid_token' });
    expect(store.listLearners()).toHaveLength(0);
  });

  it('rejects nonce mismatch with 401', async () => {
    const store = seedStore();
    const app = createApp({
      ltiStore: store,
      verifyIdToken: async () => validClaims({ nonce: 'wrong-nonce' }),
    });
    const state = store.putLoginStateSync({
      nonce: 'nonce-abc',
      iss: DEPLOY.iss,
      clientId: DEPLOY.clientId,
      deploymentId: DEPLOY.deploymentId,
    });
    const res = await app.request('/lti/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: 'x', state }).toString(),
    });
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'invalid_token' });
  });

  it('returns 404 when resource_link has no course mapping', async () => {
    const store = seedStore();
    const app = createApp({
      ltiStore: store,
      verifyIdToken: async () => validClaims({ resourceLinkId: 'unknown-res' }),
    });
    const state = store.putLoginStateSync({
      nonce: 'nonce-abc',
      iss: DEPLOY.iss,
      clientId: DEPLOY.clientId,
      deploymentId: DEPLOY.deploymentId,
    });
    const res = await app.request('/lti/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: 'x', state }).toString(),
    });
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: 'unknown_resource' });
  });
});
