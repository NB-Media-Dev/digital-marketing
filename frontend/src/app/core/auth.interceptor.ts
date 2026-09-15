import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Attaches the bearer token and transparently refreshes once on a 401.
 * Auth endpoints are skipped to avoid loops.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  // Never run the refresh-on-401 dance for auth endpoints themselves — that
  // would loop (refresh → logout → refresh …). They handle their own 401s.
  const isAuthCall = req.url.includes('/auth/');
  const authed = token && !isAuthCall
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthCall) {
        return auth.refresh().pipe(
          switchMap((res) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } })),
          ),
          catchError((refreshErr) => {
            auth.logout();
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
