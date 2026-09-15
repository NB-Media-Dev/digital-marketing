import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketingService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-ads',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="page-title">Running Ads</div>
      <button *ngIf="auth.has('ads.sync')" class="btn btn-sm btn-outline-primary" (click)="sync()" [disabled]="syncing()">
        <i class="bi bi-arrow-repeat"></i> {{ syncing() ? 'Syncing…' : 'Sync now' }}
      </button>
    </div>

    <div *ngIf="syncMsg()" class="alert alert-success py-2 small">{{ syncMsg() }}</div>

    <div class="card"><div class="card-body p-0">
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Ad</th><th>Campaign</th><th>Platform</th><th>Status</th><th>Spend</th><th>Leads</th><th>CPL</th><th>CTR</th></tr></thead>
          <tbody>
            <tr *ngFor="let a of rows()">
              <td class="fw-500">{{ a.name }}</td><td class="small">{{ a.campaign?.name }}</td>
              <td class="small">{{ a.platform }}</td><td><app-status-badge [status]="a.status"></app-status-badge></td>
              <td>₹{{ a.spend | number }}</td><td>{{ a.leads | number }}</td><td>₹{{ a.cpl }}</td><td>{{ a.ctr }}%</td>
            </tr>
            <tr *ngIf="!rows().length"><td colspan="8" class="text-center text-muted-2 py-4">No ads yet. Try “Sync now”.</td></tr>
          </tbody>
        </table>
      </div>
    </div></div>
  `,
})
export class AdsComponent implements OnInit {
  private service = inject(MarketingService);
  auth = inject(AuthService);
  rows = signal<any[]>([]);
  syncing = signal(false);
  syncMsg = signal('');

  ngOnInit() { this.load(); }
  load() { this.service.ads().subscribe((r) => this.rows.set(r)); }
  sync() {
    this.syncing.set(true);
    this.service.sync().subscribe({
      next: (r: any) => { this.syncing.set(false); this.syncMsg.set(r?.message ?? 'Sync complete.'); this.load(); setTimeout(() => this.syncMsg.set(''), 4000); },
      error: () => { this.syncing.set(false); this.syncMsg.set('Ad data could not be updated. Please try again.'); },
    });
  }
}
