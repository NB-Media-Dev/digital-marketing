import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Requires an authenticated session (frontend UX only — API enforces the real rules). */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/login']);
  return false;
};

/** Requires one of the given roles on the route's `data.roles`. */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data?.['roles'] as string[]) ?? [];
  if (roles.length === 0 || auth.hasRole(...roles)) return true;
  const home = auth.user()?.home ?? '/login';
  router.navigateByUrl(home);
  return false;
};
