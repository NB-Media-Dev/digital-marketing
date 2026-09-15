import { AuthUser } from './auth.types';

/** Per-request context passed from controllers into services. */
export interface ActionContext {
  user: AuthUser;
  ip?: string;
  ua?: string;
}
