import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketingService, DashboardService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { KpiCardComponent } from '../../shared/ui';

@Component({
  selector: 'app-marketing-dashboard',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  template: `
    <div class="page-title mb-1">{{ greeting }}, {{ firstName }}</div>
    <div class="text-muted-2 mb-3">Ad to lead performance at a glance.</div>

    <div class="row g-3">
      <div class="col-6 col-lg-3"><app-kpi label="Running Ads" [value]="running()" icon="badge-ad" tone="amber"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Today's Spend" [value]="'₹' + (m().spend | number)" icon="cash-stack" tone="primary"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Leads" [value]="m().leads | number" icon="person-lines-fill" tone="blue"></app-kpi></div>
      <div class="col-6 col-lg-3"><app-kpi label="Cost / Lead" [value]="'₹' + m().cpl" icon="graph-down" tone="green"></app-kpi></div>
    </div>

    <div class="card mt-3"><div class="card-body">
      <div class="section-title mb-2">Campaign performance</div>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Campaign</th><th>Spend</th><th>Leads</th><th>CPL</th><th>Qualified</th><th>Conversions</th><th>Conv. Rate</th></tr></thead>
          <tbody>
            <tr *ngFor="let c of campaigns()">
              <td class="fw-500">{{ c.name }}</td>
              <td>₹{{ c.spend | number }}</td><td>{{ c.leads | number }}</td><td>₹{{ c.cpl }}</td>
              <td>{{ c.qualified }}</td><td>{{ c.conversions }}</td><td>{{ c.conversionRate }}%</td>
            </tr>
            <tr *ngIf="campaigns().length === 0"><td colspan="7" class="text-center text-muted-2 py-4">No campaign data yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div></div>
  `,
})
export class MarketingDashboardComponent implements OnInit {
  private marketing = inject(MarketingService);
  private dash = inject(DashboardService);
  private auth = inject(AuthService);

  m = signal<any>({ spend: 0, leads: 0, cpl: 0 });
  running = signal(0);
  campaigns = signal<any[]>([]);

  get firstName() { return this.auth.user()?.name?.split(' ')[0] ?? ''; }
  get greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

  ngOnInit() {
    this.dash.admin('today').subscribe((d) => { this.m.set(d.marketing); this.running.set(d.kpis.runningAds); });
    this.marketing.campaignPerformance().subscribe((c) => this.campaigns.set(c));
  }
}
