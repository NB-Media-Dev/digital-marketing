import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelecallingService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { KpiCardComponent } from '../../shared/ui';

@Component({
  selector: 'app-telecaller-dashboard',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  template: `
    <div class="page-title mb-1">{{ greeting }}, {{ firstName }}</div>
    <div class="text-muted-2 mb-3">Your calling work for today.</div>

    <div class="row g-3 mb-1">
      <div class="col-6 col-lg"><app-kpi label="Assigned" [value]="d().assigned" icon="inbox" tone="blue"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Calls" [value]="d().calls" icon="telephone" tone="primary"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Connected" [value]="d().connected" icon="telephone-inbound" tone="blue"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Interested" [value]="d().interested" icon="hand-thumbs-up" tone="green"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Not Interested" [value]="d().notInterested" icon="hand-thumbs-down" tone="red"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Qualified" [value]="d().qualified" icon="patch-check" tone="green"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Converted" [value]="d().converted" icon="graph-up-arrow" tone="green"></app-kpi></div>
    </div>

    <div class="card mt-3"><div class="card-body">
      <div class="section-title mb-2">Today's follow-ups</div>
      <div class="table-responsive" *ngIf="d().followupsToday?.length; else empty">
        <table class="table">
          <thead><tr><th>Lead</th><th>Time</th><th>Remarks</th></tr></thead>
          <tbody>
            <tr *ngFor="let f of d().followupsToday">
              <td class="fw-500">{{ f.lead?.name || f.leadId }}</td>
              <td class="small">{{ f.followupDate | date:'HH:mm' }}</td>
              <td class="small text-muted-2">{{ f.remarks || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-check2-circle"></i><p class="mb-0 mt-2">You're all caught up.</p></div></ng-template>
    </div></div>
  `,
})
export class TelecallerDashboardComponent implements OnInit {
  private tele = inject(TelecallingService);
  private auth = inject(AuthService);
  d = signal<any>({ assigned: 0, calls: 0, connected: 0, interested: 0, notInterested: 0, qualified: 0, converted: 0, followupsToday: [] });

  get firstName() { return this.auth.user()?.name?.split(' ')[0] ?? ''; }
  get greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

  ngOnInit() { this.tele.dashboard().subscribe((d) => this.d.set(d)); }
}
