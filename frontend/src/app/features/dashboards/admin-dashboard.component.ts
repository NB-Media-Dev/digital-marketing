import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { SocketService } from '../../core/socket.service';
import { KpiCardComponent, StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, KpiCardComponent, StatusBadgeComponent],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
      <div>
        <div class="page-title">{{ greeting }}, {{ firstName }}</div>
        <div class="text-muted-2">Here's what's happening across the business today.</div>
      </div>
      <div class="btn-group">
        <button *ngFor="let r of ranges" class="btn btn-sm"
                [class.btn-primary]="range() === r.key" [class.btn-outline-secondary]="range() !== r.key"
                (click)="setRange(r.key)">{{ r.label }}</button>
      </div>
    </div>

    <!-- KPI row -->
    <div class="row g-3 mb-1">
      <div class="col-6 col-lg-3"><app-kpi label="Active Tasks" [value]="k().activeTasks" icon="kanban" tone="primary"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Pending Review" [value]="k().pendingReview" icon="hourglass-split" tone="blue"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Overdue Tasks" [value]="k().overdue" icon="exclamation-triangle" tone="red"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Running Ads" [value]="k().runningAds" icon="badge-ad" tone="amber"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Leads" [value]="k().leads" icon="person-lines-fill" tone="blue"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Cost / Lead" [value]="'₹' + k().cpl" icon="cash-coin" tone="primary"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Conversions" [value]="k().conversions" icon="graph-up-arrow" tone="green"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Revenue" [value]="'₹' + (k().revenue | number)" icon="wallet2" tone="green"></app-kpi></div>
    </div>

    <div class="row g-3 mt-1">
      <!-- Conversion funnel -->
      <div class="col-lg-7">
        <div class="card h-100"><div class="card-body">
          <div class="section-title mb-3">Business funnel — where performance drops</div>
          <div *ngFor="let s of funnel()?.stages" class="mb-2">
            <div class="d-flex justify-content-between small mb-1">
              <span class="fw-500">{{ s.label }}</span>
              <span class="text-muted-2">{{ s.key === 'spend' || s.key === 'revenue' ? '₹' : '' }}{{ s.value | number }}</span>
            </div>
            <div class="progress"><div class="progress-bar" [style.width.%]="barWidth(s.value)"></div></div>
          </div>
          <div *ngIf="funnel()?.insight" class="alert mt-3 mb-0 py-2 small" style="background:#FFFAEB;color:#B54708;border:1px solid #FEDF89">
            <i class="bi bi-lightbulb me-1"></i>{{ funnel()?.insight }}
          </div>
        </div></div>
      </div>

      <!-- Needs attention -->
      <div class="col-lg-5">
        <div class="card h-100"><div class="card-body">
          <div class="section-title mb-3">Needs attention</div>
          <div *ngFor="let a of data()?.needsAttention" class="d-flex gap-2 mb-3">
            <i class="bi bi-exclamation-circle-fill" [ngStyle]="{color: sevColor(a.severity)}"></i>
            <div>
              <div class="small fw-500">{{ a.issue }}</div>
              <div class="small text-muted-2">Owner: {{ a.owner }}</div>
            </div>
          </div>
          <div *ngIf="(data()?.needsAttention?.length ?? 0) === 0" class="empty-state py-3">
            <i class="bi bi-check2-circle"></i><p class="mb-0 mt-1">Everything looks healthy.</p>
          </div>
        </div></div>
      </div>
    </div>

    <!-- Telecalling performance -->
    <div class="card mt-3"><div class="card-body">
      <div class="d-flex justify-content-between mb-2">
        <div class="section-title">Telecalling performance</div>
        <a routerLink="/admin/telecalling" class="small">View all</a>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Telecaller</th><th>Assigned</th><th>Calls</th><th>Interested</th><th>Not Interested</th><th>Qualified</th><th>Conv. Rate</th></tr></thead>
          <tbody>
            <tr *ngFor="let t of data()?.telecalling">
              <td class="fw-500">{{ t.name }}</td><td>{{ t.assigned }}</td><td>{{ t.calls }}</td>
              <td>{{ t.interested }}</td>
              <td><span [class.text-danger]="t.notInterestedRatio > 50">{{ t.notInterested }}</span></td>
              <td>{{ t.qualified }}</td>
              <td>{{ t.conversionRate }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div></div>

    <!-- Recent activity -->
    <div class="card mt-3"><div class="card-body">
      <div class="section-title mb-3">Recent activity</div>
      <ul class="timeline">
        <li *ngFor="let a of data()?.recentActivity">
          <div class="t-time">{{ a.time | date:'MMM d, HH:mm' }}</div>
          <div class="small">{{ prettyAction(a.action) }} · <span class="text-muted-2">{{ a.entityType }}</span></div>
        </li>
      </ul>
    </div></div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private dash = inject(DashboardService);
  private auth = inject(AuthService);
  private socket = inject(SocketService);

  ranges = [{ key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' }];
  range = signal('today');
  data = signal<any>(null);
  funnel = signal<any>(null);

  k = computed(() => this.data()?.kpis ?? { activeTasks: 0, pendingReview: 0, overdue: 0, runningAds: 0, leads: 0, cpl: 0, conversions: 0, revenue: 0 });
  get firstName() { return this.auth.user()?.name?.split(' ')[0] ?? ''; }
  get greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

  ngOnInit() {
    this.load();
    // live refresh on key business events
    ['task.assigned', 'lead.created', 'conversion.created', 'transaction.created'].forEach((ev) =>
      this.socket.on(ev).subscribe(() => this.load()));
  }

  setRange(r: string) { this.range.set(r); this.load(); }

  load() {
    this.dash.admin(this.range()).subscribe((d) => this.data.set(d));
    this.dash.businessFunnel(this.range() === 'today' ? 'month' : this.range()).subscribe((f) => this.funnel.set(f));
  }

  barWidth(v: number): number {
    const leads = this.funnel()?.stages?.find((s: any) => s.key === 'leads')?.value ?? 0;
    if (!leads) return v > 0 ? 100 : 0;
    return Math.min(100, Math.max(4, (v / leads) * 100));
  }

  sevColor(s: string) { return s === 'high' ? '#DC3C3C' : s === 'medium' ? '#F59E0B' : '#667085'; }
  prettyAction(a: string) { return (a || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
}
