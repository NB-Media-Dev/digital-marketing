export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleCode: string;
  permissions: string[];
}

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
