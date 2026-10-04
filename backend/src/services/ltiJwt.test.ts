import { describe, expect, it, vi, afterEach } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import {
  decodeIdTokenPayloadUnsafe,
  verifyIdTokenWithJwks,
} from './ltiJwt';

const DEPLOYMENT_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id';
const MESSAGE_TYPE_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/message_type';
const VERSION_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/version';
const RESOURCE_LINK_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/resource_link';

const JWKS_URL = 'https://lms.example.edu/api/lti/security/jwks';

async function platformKeys() {
  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    extractable: true,
  });
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'platform-1';
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  return { publicKey, privateKey, jwk };
}

function mockJwksFetch(jwk: JsonWebKey) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    expect(url).toBe(JWKS_URL);
    return new Response(JSON.stringify({ keys: [jwk] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

async function signIdToken(
  privateKey: CryptoKey,
  payload: Record<string, unknown>,
  kid = 'platform-1',
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid, typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

describe('verifyIdTokenWithJwks', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('accepts a Platform-signed RS256 id_token against JWKS', async () => {
    const { privateKey, jwk } = await platformKeys();
    const fetchMock = mockJwksFetch(jwk);
    vi.stubGlobal('fetch', fetchMock);

    const token = await signIdToken(privateKey, {
      iss: 'https://lms.example.edu',
      aud: 'unitutor-tool',
      sub: 'learner-42',
      nonce: 'nonce-abc',
      [DEPLOYMENT_CLAIM]: 'deploy-1',
      [MESSAGE_TYPE_CLAIM]: 'LtiResourceLinkRequest',
      [VERSION_CLAIM]: '1.3.0',
      [RESOURCE_LINK_CLAIM]: { id: 'res-cs50p' },
    });

    const claims = await verifyIdTokenWithJwks(token, JWKS_URL);
    expect(claims).toMatchObject({
      iss: 'https://lms.example.edu',
      aud: 'unitutor-tool',
      sub: 'learner-42',
      nonce: 'nonce-abc',
      deploymentId: 'deploy-1',
      messageType: 'LtiResourceLinkRequest',
      resourceLinkId: 'res-cs50p',
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('rejects unsigned (alg none / no signature) tokens', async () => {
    const { jwk } = await platformKeys();
    vi.stubGlobal('fetch', mockJwksFetch(jwk));

    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const payload = btoa(
      JSON.stringify({
        iss: 'https://lms.example.edu',
        aud: 'unitutor-tool',
        sub: 'attacker',
        nonce: 'n',
        [DEPLOYMENT_CLAIM]: 'deploy-1',
        [MESSAGE_TYPE_CLAIM]: 'LtiResourceLinkRequest',
        [VERSION_CLAIM]: '1.3.0',
        [RESOURCE_LINK_CLAIM]: { id: 'res-cs50p' },
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const unsigned = `${header}.${payload}.`;

    await expect(verifyIdTokenWithJwks(unsigned, JWKS_URL)).rejects.toThrow();
  });

  it('rejects tokens with invalid signature', async () => {
    const a = await platformKeys();
    const b = await platformKeys();
    vi.stubGlobal('fetch', mockJwksFetch(a.jwk));

    const token = await signIdToken(b.privateKey, {
      iss: 'https://lms.example.edu',
      aud: 'unitutor-tool',
      sub: 'learner-42',
      nonce: 'nonce-abc',
      [DEPLOYMENT_CLAIM]: 'deploy-1',
      [MESSAGE_TYPE_CLAIM]: 'LtiResourceLinkRequest',
      [VERSION_CLAIM]: '1.3.0',
      [RESOURCE_LINK_CLAIM]: { id: 'res-cs50p' },
    });

    await expect(verifyIdTokenWithJwks(token, JWKS_URL)).rejects.toThrow();
  });

  it('rejects expired tokens', async () => {
    const { privateKey, jwk } = await platformKeys();
    vi.stubGlobal('fetch', mockJwksFetch(jwk));

    const token = await new SignJWT({
      iss: 'https://lms.example.edu',
      aud: 'unitutor-tool',
      sub: 'learner-42',
      nonce: 'nonce-abc',
      [DEPLOYMENT_CLAIM]: 'deploy-1',
      [MESSAGE_TYPE_CLAIM]: 'LtiResourceLinkRequest',
      [VERSION_CLAIM]: '1.3.0',
      [RESOURCE_LINK_CLAIM]: { id: 'res-cs50p' },
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-1', typ: 'JWT' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 120)
      .sign(privateKey);

    await expect(verifyIdTokenWithJwks(token, JWKS_URL)).rejects.toThrow();
  });
});

describe('decodeIdTokenPayloadUnsafe', () => {
  it('still decodes payload for test fixtures only', () => {
    const payload = btoa(
      JSON.stringify({
        iss: 'https://lms.example.edu',
        aud: 'unitutor-tool',
        sub: 'x',
        nonce: 'n',
        [DEPLOYMENT_CLAIM]: 'd',
        [MESSAGE_TYPE_CLAIM]: 'LtiResourceLinkRequest',
        [VERSION_CLAIM]: '1.3.0',
        [RESOURCE_LINK_CLAIM]: { id: 'r' },
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const claims = decodeIdTokenPayloadUnsafe(`e30.${payload}.sig`);
    expect(claims.sub).toBe('x');
    expect(claims.resourceLinkId).toBe('r');
  });
});
