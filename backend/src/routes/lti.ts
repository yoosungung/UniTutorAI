import { Hono } from 'hono';
import type { Bindings } from '../types/bindings';
import { verifyIdTokenWithJwks } from '../services/ltiJwt';
import {
  D1LtiStore,
  type LtiIdTokenClaims,
  type LtiStore,
} from '../services/ltiStore';

export type LtiRouteOptions = {
  ltiStore?: LtiStore;
  /** Override JWKS verify (unit tests). Production default = Platform JWKS. */
  verifyIdToken?: (idToken: string, jwksUrl: string) => Promise<LtiIdTokenClaims>;
};

export { decodeIdTokenPayloadUnsafe } from '../services/ltiJwt';

function assertLaunchClaims(
  claims: LtiIdTokenClaims,
  expected: {
    iss: string;
    clientId: string;
    deploymentId: string;
    nonce: string;
  },
): void {
  if (
    claims.iss !== expected.iss ||
    claims.aud !== expected.clientId ||
    claims.deploymentId !== expected.deploymentId ||
    claims.nonce !== expected.nonce ||
    claims.messageType !== 'LtiResourceLinkRequest' ||
    !claims.sub ||
    !claims.resourceLinkId
  ) {
    throw new Error('invalid_token');
  }
}

export function createLtiRoutes(options: LtiRouteOptions = {}) {
  const lti = new Hono<{ Bindings: Bindings }>();

  function resolveStore(c: { env: Bindings }): LtiStore {
    if (options.ltiStore) return options.ltiStore;
    if (c.env.DB) return new D1LtiStore(c.env.DB);
    throw new Error('lti_store_unavailable');
  }

  const verify = options.verifyIdToken ?? verifyIdTokenWithJwks;

  lti.get('/oidc/login', async (c) => {
    const iss = c.req.query('iss')?.trim();
    const clientId = c.req.query('client_id')?.trim();
    const deploymentId = c.req.query('lti_deployment_id')?.trim();
    const loginHint = c.req.query('login_hint')?.trim();
    const targetLinkUri = c.req.query('target_link_uri')?.trim();
    const messageHint = c.req.query('lti_message_hint')?.trim();

    if (!iss || !clientId || !deploymentId || !loginHint || !targetLinkUri) {
      return c.json({ error: 'invalid_request' }, 400);
    }

    let store: LtiStore;
    try {
      store = resolveStore(c);
    } catch {
      return c.json({ error: 'lti_store_unavailable' }, 503);
    }

    const deployment = await store.getDeployment(iss, clientId, deploymentId);
    if (!deployment) {
      return c.json({ error: 'unknown_deployment' }, 404);
    }

    const nonce = crypto.randomUUID();
    const state = await store.putLoginState({
      nonce,
      iss,
      clientId,
      deploymentId,
    });

    const auth = new URL(deployment.authLoginUrl);
    auth.searchParams.set('scope', 'openid');
    auth.searchParams.set('response_type', 'id_token');
    auth.searchParams.set('response_mode', 'form_post');
    auth.searchParams.set('prompt', 'none');
    auth.searchParams.set('client_id', clientId);
    auth.searchParams.set('redirect_uri', targetLinkUri);
    auth.searchParams.set('login_hint', loginHint);
    auth.searchParams.set('state', state);
    auth.searchParams.set('nonce', nonce);
    if (messageHint) {
      auth.searchParams.set('lti_message_hint', messageHint);
    }

    return c.redirect(auth.toString(), 302);
  });

  lti.post('/launch', async (c) => {
    const body = await c.req.parseBody();
    const idToken = String(body['id_token'] ?? '').trim();
    const state = String(body['state'] ?? '').trim();
    if (!idToken || !state) {
      return c.json({ error: 'invalid_request' }, 400);
    }

    let store: LtiStore;
    try {
      store = resolveStore(c);
    } catch {
      return c.json({ error: 'lti_store_unavailable' }, 503);
    }

    const login = await store.consumeLoginState(state);
    if (!login) {
      return c.json({ error: 'invalid_state' }, 401);
    }

    const deployment = await store.getDeployment(
      login.iss,
      login.clientId,
      login.deploymentId,
    );
    if (!deployment) {
      return c.json({ error: 'unknown_deployment' }, 404);
    }

    let claims: LtiIdTokenClaims;
    try {
      claims = await verify(idToken, deployment.jwksUrl);
      assertLaunchClaims(claims, login);
    } catch {
      return c.json({ error: 'invalid_token' }, 401);
    }

    const courseId = await store.getCourseId(
      claims.iss,
      claims.aud,
      claims.deploymentId,
      claims.resourceLinkId,
    );
    if (!courseId) {
      return c.json({ error: 'unknown_resource' }, 404);
    }

    const learner = await store.upsertLearner({
      iss: claims.iss,
      clientId: claims.aud,
      deploymentId: claims.deploymentId,
      subject: claims.sub,
    });

    const origin =
      c.env?.FRONTEND_ORIGIN?.replace(/\/$/, '') || deployment.frontendOrigin;
    const dest = new URL('/', origin);
    dest.searchParams.set('courseId', courseId);
    dest.searchParams.set('ltiLearnerId', learner.id);
    return c.redirect(dest.toString(), 302);
  });

  return lti;
}
