import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { Paginated } from './models';

/** Standard API envelope from the Express backend. */
interface Envelope<T> { success: boolean; message: string; data: T; }
interface PaginatedEnvelope<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Thin typed wrapper around HttpClient. It unwraps the backend's
 * { success, message, data } envelope so feature services and components keep
 * working with plain payloads.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private toParams(query?: Record<string, any>): HttpParams {
    let params = new HttpParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
      }
    }
    return params;
  }

  get<T>(path: string, query?: Record<string, any>): Observable<T> {
    return this.http.get<Envelope<T>>(`${this.base}${path}`, { params: this.toParams(query), withCredentials: true })
      .pipe(map((r) => r.data));
  }

  /** For list endpoints — maps the pagination envelope to Paginated<T>. */
  getPaginated<T>(path: string, query?: Record<string, any>): Observable<Paginated<T>> {
    return this.http.get<PaginatedEnvelope<T>>(`${this.base}${path}`, { params: this.toParams(query), withCredentials: true })
      .pipe(map((r) => ({
        items: r.data,
        total: r.pagination.total,
        page: r.pagination.page,
        limit: r.pagination.limit,
        pages: r.pagination.totalPages,
      })));
  }

  post<T>(path: string, body?: any): Observable<T> {
    return this.http.post<Envelope<T>>(`${this.base}${path}`, body ?? {}, { withCredentials: true })
      .pipe(map((r) => r.data));
  }

  patch<T>(path: string, body?: any): Observable<T> {
    return this.http.patch<Envelope<T>>(`${this.base}${path}`, body ?? {}, { withCredentials: true })
      .pipe(map((r) => r.data));
  }

  /** Multipart upload (FormData) — unwraps the envelope like post(). */
  upload<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<Envelope<T>>(`${this.base}${path}`, form, { withCredentials: true })
      .pipe(map((r) => r.data));
  }

  /** For CSV/blob downloads (unwrapped). */
  blob(path: string, query?: Record<string, any>): Observable<Blob> {
    return this.http.get(`${this.base}${path}`, {
      params: this.toParams(query), responseType: 'blob', withCredentials: true,
    });
  }
}
