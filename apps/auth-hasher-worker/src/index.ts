import { WorkerEntrypoint } from 'cloudflare:workers';
import type { AuthHasherRuntimeEnv } from '@repo/auth-hasher-contracts';
import { handleFetch } from './fetch-handler';
import { hashPassword, verifyPassword } from './kernel';

type WorkerEnv = AuthHasherRuntimeEnv;

export default class AuthHasherWorker extends WorkerEntrypoint<WorkerEnv> {
  override fetch(request: Request): Promise<Response> {
    return Promise.resolve(handleFetch(request, this.env));
  }

  hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  }

  verifyPassword(hash: string, password: string): Promise<boolean> {
    return verifyPassword(hash, password);
  }
}
