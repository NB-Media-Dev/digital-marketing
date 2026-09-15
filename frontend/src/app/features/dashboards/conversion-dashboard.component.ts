import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversionService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { KpiCardComponent, StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-conversion-dashboard',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, StatusBadgeComponent],
  template: `
    <div class="page-title mb-1">{{ greeting }}, {{ firstName }}</div>
    <div class="text-muted-2 mb-3">Qualified leads through to revenue.</div>

    <div class="row g-3 mb-1">
      <div class="col-6 col-lg"><app-kpi label="Qualified Leads" [value]="d().qualifiedLeads" icon="person-check" tone="blue"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Conversions" [value]="d().conversions" icon="graph-up-arrow" tone="green"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Conversion Rate" [value]="d().conversionRate + '%'" icon="percent" tone="primary"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Pending Payments" [value]="d().pendingPayments" icon="hourglass-split" tone="amber"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Revenue" [value]="'₹' + (d().revenue | number)" icon="wallet2" tone="green"></app-kpi></div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-lg-6"><div class="card h-100"><div class="card-body">
        <div class="section-title mb-2">Recent conversions</div>
        <div class="table-responsive"><table class="table">
          <thead><tr><th>Code</th><th>Lead</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let c of d().recentConversions">
              <td class="small">{{ c.conversionCode }}</td><td>{{ c.lead?.name }}</td>
              <td>₹{{ c.amount | number }}</td><td><app-status-badge [status]="c.status"></app-status-badge></td>
            </tr>
            <tr *ngIf="!d().recentConversions?.length"><td colspan="4" class="text-center text-muted-2 py-3">No conversions yet.</td></tr>
          </tbody>
        </table></div>
      </div></div></div>

      <div class="col-lg-6"><div class="card h-100"><div class="card-body">
        <div class="section-title mb-2">Pending transactions</div>
        <div class="table-responsive"><table class="table">
          <thead><tr><th>Code</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let t of d().pendingTransactions">
              <td class="small">{{ t.transactionCode }}</td><td>₹{{ t.amount | number }}</td>
              <td class="small">{{ t.paymentMethod }}</td><td><app-status-badge [status]="t.paymentStatus"></app-status-badge></td>
            </tr>
            <tr *ngIf="!d().pendingTransactions?.length"><td colspan="4" class="text-center text-muted-2 py-3">No pending payments.</td></tr>
          </tbody>
        </table></div>
      </div></div></div>
    </div>
  `,
})
export class ConversionDashboardComponent implements OnInit {
  private conv = inject(ConversionService);
  private auth = inject(AuthService);
  d = signal<any>({ qualifiedLeads: 0, conversions: 0, conversionRate: 0, pendingPayments: 0, revenue: 0, recentConversions: [], pendingTransactions: [] });

  get firstName() { return this.auth.user()?.name?.split(' ')[0] ?? ''; }
  get greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

  ngOnInit() { this.conv.dashboard().subscribe((d) => this.d.set(d)); }
}
