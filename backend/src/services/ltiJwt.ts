import { createLocalJWKSet, jwtVerify, type JWTPayload, type JSONWebKeySet } from 'jose';
import type { LtiIdTokenClaims } from './ltiStore';

const DEPLOYMENT_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id';
const MESSAGE_TYPE_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/message_type';
const VERSION_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/version';
const RESOURCE_LINK_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/resource_link';

/** ±skew (seconds) for exp/iat — LTI platforms and edge clocks. */
const CLOCK_TOLERANCE_SEC = 60;

/** Only asymmetric algs used by LTI 1.3 Platforms — rejects alg=none. */
const ALLOWED_ALGS = ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'];

export function claimsFromJwtPayload(payload: JWTPayload): LtiIdTokenClaims {
  const audRaw = payload.aud;
  const aud = Array.isArray(audRaw)
    ? String(audRaw[0] ?? '')
    : String(audRaw ?? '');
  const resource = payload[RESOURCE_LINK_CLAIM] as { id?: string } | undefined;
  return {
    iss: String(payload.iss ?? ''),
    aud,
    sub: String(payload.sub ?? ''),
    nonce: String(payload.nonce ?? ''),
    deploymentId: String(payload[DEPLOYMENT_CLAIM] ?? ''),
    messageType: String(payload[MESSAGE_TYPE_CLAIM] ?? ''),
    version: String(payload[VERSION_CLAIM] ?? ''),
    resourceLinkId: String(resource?.id ?? ''),
  };
}

async function fetchJwks(jwksUrl: string): Promise<JSONWebKeySet> {
  const res = await fetch(jwksUrl);
  if (!res.ok) {
    throw new Error(`jwks_fetch_failed:${res.status}`);
  }
  const body = (await res.json()) as JSONWebKeySet;
  if (!body || !Array.isArray(body.keys)) {
    throw new Error('jwks_invalid');
  }
  return body;
}

/**
 * Verify Platform-signed LTI 1.3 id_token against deployment JWKS.
 * Fail-closed: unsigned / wrong key / expired / JWKS fetch fail → throw.
 * Uses global `fetch` (Workers + stubbable in tests) then local JWKS verify.
 */
export async function verifyIdTokenWithJwks(
  idToken: string,
  jwksUrl: string,
): Promise<LtiIdTokenClaims> {
  const jwks = await fetchJwks(jwksUrl);
  const keySet = createLocalJWKSet(jwks);
  const { payload } = await jwtVerify(idToken, keySet, {
    clockTolerance: CLOCK_TOLERANCE_SEC,
    algorithms: ALLOWED_ALGS,
  });
  return claimsFromJwtPayload(payload);
}

/** Test-only payload decode — never the Workers default. */
export function decodeIdTokenPayloadUnsafe(idToken: string): LtiIdTokenClaims {
  const parts = idToken.split('.');
  if (parts.length < 2) throw new Error('malformed_jwt');
  const json = JSON.parse(
    atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
  ) as JWTPayload;
  return claimsFromJwtPayload(json);
}
