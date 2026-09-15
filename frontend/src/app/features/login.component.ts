import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="d-flex" style="min-height:100vh">
      <!-- brand panel -->
      <div class="d-none d-lg-flex flex-column justify-content-between p-5 text-white"
           style="width:44%;background:linear-gradient(160deg,#172033,#243349)">
        <div class="d-flex align-items-center gap-2 fs-4 fw-bold">
          <span class="mark" style="width:34px;height:34px;border-radius:9px;background:var(--primary);display:grid;place-items:center">
            <i class="bi bi-broadcast-pin"></i></span> MarkOps
        </div>
        <div>
          <h1 class="fw-bold" style="font-size:34px;line-height:1.2">See exactly where your business is winning or losing.</h1>
          <p class="mt-3" style="color:#b6c2d4;max-width:440px">
            From ad spend to revenue — every task, lead, call and conversion connected into one traceable chain.
          </p>
        </div>
        <div class="small" style="color:#8ea0b8">Marketing Operations &amp; Performance Management</div>
      </div>

      <!-- form panel -->
      <div class="flex-grow-1 d-flex align-items-center justify-content-center p-4" style="background:var(--bg)">
        <div style="width:100%;max-width:380px">
          <h2 class="fw-bold mb-1">Welcome back</h2>
          <p class="text-muted-2 mb-4">Sign in to continue to your dashboard.</p>

          <div *ngIf="error()" class="alert alert-danger py-2 small">{{ error() }}</div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <label class="form-label small fw-500">Email</label>
            <input class="form-control mb-1" type="email" formControlName="email" placeholder="you@company.com" autocomplete="username" />
            <div class="text-danger small mb-2" *ngIf="showErr('email')">Please enter a valid email.</div>

            <label class="form-label small fw-500 mt-2">Password</label>
            <input class="form-control mb-1" type="password" formControlName="password" placeholder="••••••••" autocomplete="current-password" />
            <div class="text-danger small mb-2" *ngIf="showErr('password')">Password is required.</div>

            <div class="d-flex justify-content-between align-items-center my-3">
              <label class="small d-flex align-items-center gap-2">
                <input type="checkbox" formControlName="rememberMe" /> Remember me
              </label>
              <a class="small" href="javascript:void(0)">Forgot password?</a>
            </div>

            <button class="btn btn-primary w-100" [disabled]="loading()">
              <span *ngIf="loading()" class="spinner-border spinner-border-sm me-2"></span>
              Sign in
            </button>
          </form>

          <div class="mt-4 p-3 surface small">
            <div class="fw-600 mb-1">Demo accounts — password <code>Password123!</code></div>
            <div class="text-muted-2">admin&#64;markops.dev · arun&#64;markops.dev · priya&#64;markops.dev · conversion&#64;markops.dev</div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    email: ['admin@markops.dev', [Validators.required, Validators.email]],
    password: ['Password123!', [Validators.required]],
    rememberMe: [true],
  });

  ngOnInit() {
    if (this.auth.isAuthenticated()) this.router.navigateByUrl(this.auth.user()!.home);
  }

  showErr(name: string) {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const { email, password, rememberMe } = this.form.value;
    this.auth.login(email!, password!, !!rememberMe).subscribe({
      next: (res) => { this.loading.set(false); this.router.navigateByUrl(res.user.home); },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.message ?? 'Incorrect email or password.');
      },
    });
  }
}
