import { describe, expect, it } from 'vitest';
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

function seedStore(): MemoryLtiStore {
  const store = new MemoryLtiStore();
  store.seedDeployment(DEPLOY);
  store.seedResourceCourse({
    iss: DEPLOY.iss,
    clientId: DEPLOY.clientId,
    deploymentId: DEPLOY.deploymentId,
    resourceLinkId: 'res-cs50p',
    courseId: 'cs50p-l0',
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
    expect(loc.searchParams.get('courseId')).toBe('cs50p-l0');
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
