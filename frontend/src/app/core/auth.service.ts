import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '@env/environment';
import { AuthUser, LoginResponse } from './models';

interface Envelope<T> { success: boolean; message: string; data: T; }

const TOKEN_KEY = 'markops_token';

/** Holds the session, exposes signals, and drives login/logout redirects. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = environment.apiUrl;

  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  get token(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  private setToken(t: string | null) {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  }

  login(email: string, password: string, rememberMe: boolean): Observable<LoginResponse> {
    return this.http.post<Envelope<LoginResponse>>(`${this.base}/auth/login`, { email, password, rememberMe },
      { withCredentials: true }).pipe(
      map((res) => res.data),
      tap((data) => {
        this.setToken(data.accessToken);
        this.user.set(data.user);
      }),
    );
  }

  /** Called on app start to restore the session from the cookie/token. */
  loadSession(): Observable<AuthUser> {
    return this.http.get<Envelope<AuthUser>>(`${this.base}/auth/me`, { withCredentials: true }).pipe(
      map((res) => res.data),
      tap((u) => this.user.set(u)),
    );
  }

  refresh(): Observable<LoginResponse> {
    return this.http.post<Envelope<LoginResponse>>(`${this.base}/auth/refresh`, {}, { withCredentials: true }).pipe(
      map((res) => res.data),
      tap((data) => { this.setToken(data.accessToken); this.user.set(data.user); }),
    );
  }

  logout() {
    this.http.post(`${this.base}/auth/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.finishLogout(), error: () => this.finishLogout(),
    });
  }

  private finishLogout() {
    this.setToken(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  has(permission: string): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }

  hasRole(...roles: string[]): boolean {
    const rc = this.user()?.roleCode;
    return rc ? roles.includes(rc) : false;
  }
}
