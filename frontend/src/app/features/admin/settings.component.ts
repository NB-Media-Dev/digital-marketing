import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MetaService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  template: `
    <div class="page-title mb-1">Settings</div>
    <div class="text-muted-2 mb-3">Manage integrations and system configuration.</div>

    <div class="d-flex gap-2 mb-3 flex-wrap">
      <button *ngFor="let t of tabs" class="btn btn-sm" [class.btn-primary]="tab() === t.key" [class.btn-outline-secondary]="tab() !== t.key" (click)="tab.set(t.key)">{{ t.label }}</button>
    </div>

    <!-- Integrations → Meta Ads -->
    <div *ngIf="tab() === 'integrations'">
      <div *ngIf="msg()" class="alert py-2 small" [ngClass]="err() ? 'alert-danger' : 'alert-success'">{{ msg() }}</div>

      <div class="card mb-3" *ngIf="status() as s"><div class="card-body">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div class="d-flex align-items-center gap-3">
            <div class="kpi-icon" style="background:#EEF2FF;color:#4338CA;width:44px;height:44px"><i class="bi bi-meta fs-5"></i></div>
            <div>
              <div class="section-title">Meta Ads (Facebook &amp; Instagram)</div>
              <div class="small text-muted-2">Sync campaigns, ads, spend and leads from your Meta ad account.</div>
            </div>
          </div>
          <app-status-badge [status]="s.status"></app-status-badge>
        </div>

        <div class="row g-3 mt-2">
          <div class="col-6 col-md-3"><div class="small text-muted-2">Ad account</div><div class="fw-500">{{ s.adAccountName || '—' }}</div></div>
          <div class="col-6 col-md-3"><div class="small text-muted-2">Last sync</div><div class="fw-500">{{ s.lastSyncAt ? (s.lastSyncAt | date:'MMM d, HH:mm') : 'Never' }}</div></div>
          <div class="col-6 col-md-3"><div class="small text-muted-2">Campaigns</div><div class="fw-500">{{ s.counts.campaigns }}</div></div>
          <div class="col-6 col-md-3"><div class="small text-muted-2">Ads · Leads</div><div class="fw-500">{{ s.counts.ads }} · {{ s.counts.leads | number }}</div></div>
        </div>

        <div *ngIf="s.mockMode" class="alert py-2 small mt-3 mb-0" style="background:#FFFAEB;color:#B54708;border:1px solid #FEDF89">
          <i class="bi bi-info-circle me-1"></i>App credentials aren't configured — running in <strong>demo mode</strong> with simulated Meta data.
          Set <code>META_APP_ID</code> / <code>META_APP_SECRET</code> in the backend <code>.env</code> for a live connection.
        </div>

        <div class="d-flex gap-2 mt-3 flex-wrap">
          <button *ngIf="s.status !== 'CONNECTED' && !s.mockMode" class="btn btn-sm btn-primary" (click)="connectReal()">
            <i class="bi bi-box-arrow-up-right me-1"></i>Connect Meta
          </button>
          <button *ngIf="s.status !== 'CONNECTED' && s.mockMode" class="btn btn-sm btn-primary" (click)="connectDemo()">Connect (demo)</button>
          <button *ngIf="s.status === 'CONNECTED'" class="btn btn-sm btn-outline-primary" (click)="test()">Test connection</button>
          <button *ngIf="s.status === 'CONNECTED'" class="btn btn-sm btn-outline-primary" (click)="sync()" [disabled]="busy()">{{ busy() ? 'Syncing…' : 'Sync now' }}</button>
          <button *ngIf="s.status === 'CONNECTED'" class="btn btn-sm btn-outline-danger" (click)="disconnect()">Disconnect</button>
        </div>
      </div></div>

      <div class="card"><div class="card-body">
        <div class="section-title mb-2">Sync history</div>
        <div class="table-responsive"><table class="table">
          <thead><tr><th>When</th><th>Source</th><th>Status</th><th>Ads synced</th><th>Message</th></tr></thead>
          <tbody>
            <tr *ngFor="let l of logs()">
              <td class="small">{{ l.startedAt | date:'MMM d, HH:mm' }}</td>
              <td class="small">{{ l.source }}</td>
              <td><app-status-badge [status]="l.status"></app-status-badge></td>
              <td>{{ l.adsSynced }}</td>
              <td class="small text-muted-2">{{ l.message }}</td>
            </tr>
            <tr *ngIf="!logs().length"><td colspan="5" class="text-center text-muted-2 py-3">No sync runs yet.</td></tr>
          </tbody>
        </table></div>
        <div class="small text-muted-2 mt-2">
          Required Meta permissions for a live connection: <code>ads_read</code>, <code>ads_management</code>,
          <code>leads_retrieval</code>, <code>pages_show_list</code>, <code>business_management</code> (subject to Meta App Review).
        </div>
      </div></div>
    </div>

    <div *ngIf="tab() !== 'integrations'" class="card"><div class="card-body">
      <div class="empty-state"><i class="bi bi-sliders"></i><p class="mb-0 mt-2">{{ tabLabel() }} settings — managed by your administrator.</p></div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private meta = inject(MetaService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  tabs = [
    { key: 'integrations', label: 'Integrations' },
    { key: 'company', label: 'Company' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'system', label: 'System' },
  ];
  tab = signal('integrations');
  status = signal<any>(null);
  logs = signal<any[]>([]);
  msg = signal(''); err = signal(false); busy = signal(false);

  tabLabel() { return this.tabs.find((t) => t.key === this.tab())?.label ?? ''; }

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('meta') === 'connected') this.flash('Meta connected successfully.', false);
    this.load();
  }

  load() {
    this.meta.status().subscribe((s) => this.status.set(s));
    this.meta.syncLogs().subscribe((l) => this.logs.set(l));
  }

  connectReal() {
    this.meta.authUrl().subscribe({
      next: (r) => { window.location.href = r.url; },
      error: (e) => this.flash(e?.error?.message ?? 'Unable to start Meta connection.', true),
    });
  }
  connectDemo() { this.meta.connectDemo().subscribe({ next: () => { this.flash('Meta connected (demo).', false); this.load(); }, error: () => this.flash('Could not connect.', true) }); }
  test() { this.meta.test().subscribe({ next: (r) => this.flash(r.message ?? 'Connection healthy.', false), error: (e) => this.flash(e?.error?.message ?? 'Connection failed.', true) }); }
  sync() { this.busy.set(true); this.meta.sync().subscribe({ next: (r) => { this.busy.set(false); this.flash(r?.message ?? 'Sync complete.', false); this.load(); }, error: () => { this.busy.set(false); this.flash('Sync failed.', true); } }); }
  disconnect() { this.meta.disconnect().subscribe({ next: () => { this.flash('Meta disconnected.', false); this.load(); } }); }

  flash(m: string, e: boolean) { this.msg.set(m); this.err.set(e); setTimeout(() => this.msg.set(''), 4000); }
}
