import {
  type AuthHasherMetadata,
  type AuthHasherRuntimeEnv,
  isMetadataRouteEnabled,
} from '@repo/auth-hasher-contracts';
import buildManifest from './rust-wasm-kernel.build.json';
import packageJson from '../package.json';

const jsonResponse = (status: number, payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const notFoundResponse = (): Response => new Response(null, { status: 404 });

export const buildMetadata = (env?: AuthHasherRuntimeEnv): AuthHasherMetadata => {
  return {
    algorithm: 'argon2id',
    version: packageJson.version,
    artifactSourceChecksum: buildManifest.artifactSourceChecksum,
    preset: buildManifest.artifactPreset,
    argon2id: buildManifest.artifactArgon2id,
    rpc: ['hashPassword', 'verifyPassword'],
    owaspAligned: buildManifest.artifactOwaspAligned,
  };
};

export const handleFetch = (request: Request, env?: AuthHasherRuntimeEnv): Response => {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/' && isMetadataRouteEnabled(env)) {
    return jsonResponse(200, buildMetadata(env));
  }

  return notFoundResponse();
};
