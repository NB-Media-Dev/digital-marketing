import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div *ngIf="loading()" class="d-flex justify-content-center align-items-center" style="height:100vh">
      <div class="text-center">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2 text-muted-2">Loading MarkOps…</p>
      </div>
    </div>
    <router-outlet *ngIf="!loading()"></router-outlet>
  `,
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  loading = signal(true);

  ngOnInit() {
    // Restore session from the http-only cookie on first load.
    this.auth.loadSession().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }
}
