const AUTH_BRIDGE_USER_ID_HEADER = 'x-orpc-auth-user-id';
const AUTH_BRIDGE_TIMESTAMP_HEADER = 'x-orpc-auth-timestamp';
const AUTH_BRIDGE_SIGNATURE_HEADER = 'x-orpc-auth-signature';

export const DEV_AUTH_BRIDGE_SECRET = 'dev-better-auth-secret-change-me';
export const AUTH_BRIDGE_MAX_AGE_SECONDS = 60;

type AuthBridgeHeaders = {
  [AUTH_BRIDGE_USER_ID_HEADER]: string;
  [AUTH_BRIDGE_TIMESTAMP_HEADER]: string;
  [AUTH_BRIDGE_SIGNATURE_HEADER]: string;
};

type ResolveAuthBridgeSecretOptions = {
  allowDevFallback?: boolean;
};

const encoder = new TextEncoder();

const toBase64Url = (value: ArrayBuffer): string =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const constantTimeEqual = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
};

const createPayload = (userId: string, timestamp: string) => `${userId}:${timestamp}`;

const signPayload = async (payload: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(signature);
};

const readHeader = (headers: Headers | Record<string, string | undefined>, name: string): string | null => {
  if (headers instanceof Headers) {
    return headers.get(name);
  }

  const direct = headers[name];
  if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim();

  const lowerCase = headers[name.toLowerCase()];
  if (typeof lowerCase === 'string' && lowerCase.trim().length > 0) return lowerCase.trim();

  return null;
};

export const hasAuthBridgeHeaders = (headers: Headers | Record<string, string | undefined>): boolean =>
  !!readHeader(headers, AUTH_BRIDGE_USER_ID_HEADER) &&
  !!readHeader(headers, AUTH_BRIDGE_TIMESTAMP_HEADER) &&
  !!readHeader(headers, AUTH_BRIDGE_SIGNATURE_HEADER);

export const resolveAuthBridgeSecret = (
  env: Record<string, unknown> | undefined,
  options: ResolveAuthBridgeSecretOptions = {},
): string => {
  const envSecret = env?.BETTER_AUTH_SECRET;
  if (typeof envSecret === 'string' && envSecret.trim().length > 0) {
    return envSecret.trim();
  }

  const processSecret =
    typeof process !== 'undefined' && typeof process.env?.BETTER_AUTH_SECRET === 'string'
      ? process.env.BETTER_AUTH_SECRET.trim()
      : '';

  if (processSecret) {
    return processSecret;
  }

  if (options.allowDevFallback) {
    return DEV_AUTH_BRIDGE_SECRET;
  }

  throw new Error('Missing BETTER_AUTH_SECRET.');
};

export const createAuthBridgeHeaders = async (
  userId: string,
  secret: string,
  now = new Date(),
): Promise<AuthBridgeHeaders> => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error('Cannot create auth bridge headers without a user id.');
  }

  const timestamp = Math.floor(now.getTime() / 1000).toString();
  const signature = await signPayload(createPayload(normalizedUserId, timestamp), secret);

  return {
    [AUTH_BRIDGE_USER_ID_HEADER]: normalizedUserId,
    [AUTH_BRIDGE_TIMESTAMP_HEADER]: timestamp,
    [AUTH_BRIDGE_SIGNATURE_HEADER]: signature,
  };
};

export const verifyAuthBridgeHeaders = async (
  headers: Headers | Record<string, string | undefined>,
  secret: string,
  now = new Date(),
): Promise<string | null> => {
  const userId = readHeader(headers, AUTH_BRIDGE_USER_ID_HEADER);
  const timestamp = readHeader(headers, AUTH_BRIDGE_TIMESTAMP_HEADER);
  const signature = readHeader(headers, AUTH_BRIDGE_SIGNATURE_HEADER);

  if (!userId || !timestamp || !signature) {
    return null;
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return null;
  }

  const ageSeconds = Math.abs(Math.floor(now.getTime() / 1000) - timestampSeconds);
  if (ageSeconds > AUTH_BRIDGE_MAX_AGE_SECONDS) {
    return null;
  }

  const expectedSignature = await signPayload(createPayload(userId, timestamp), secret);
  return constantTimeEqual(signature, expectedSignature) ? userId : null;
};

export {
  AUTH_BRIDGE_SIGNATURE_HEADER,
  AUTH_BRIDGE_TIMESTAMP_HEADER,
  AUTH_BRIDGE_USER_ID_HEADER,
  type AuthBridgeHeaders,
};
