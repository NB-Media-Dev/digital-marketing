import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/data.services';
import { KpiCardComponent, StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [CommonModule, RouterLink, KpiCardComponent, StatusBadgeComponent],
  template: `
    <div class="page-title mb-1">Pending &amp; Attention</div>
    <div class="text-muted-2 mb-3">Everything that needs action, in one place.</div>

    <!-- Today's activity -->
    <div class="section-title mb-2">Today's activity</div>
    <div class="row g-3 mb-3" *ngIf="today() as t">
      <div class="col-6 col-lg"><app-kpi label="Tasks completed" [value]="t.tasksCompleted" icon="check2-circle" tone="green"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Ads running" [value]="t.adsRunning" icon="badge-ad" tone="amber"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Leads" [value]="t.leads" icon="person-lines-fill" tone="blue"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Calls" [value]="t.calls" icon="telephone" tone="primary"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Conversions" [value]="t.conversions" icon="graph-up-arrow" tone="green"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Revenue" [value]="'₹' + (t.revenue | number)" icon="wallet2" tone="green"></app-kpi></div>
    </div>

    <div class="row g-3">
      <!-- Business health -->
      <div class="col-lg-5"><div class="card h-100"><div class="card-body">
        <div class="section-title mb-2">Business health</div>
        <div *ngFor="let h of health()" class="health-row">
          <div>
            <div class="fw-500">{{ h.area }}</div>
            <div class="small text-muted-2">{{ h.detail }}</div>
          </div>
          <span class="pill" [class.pill-ok]="h.ok" [class.pill-warn]="!h.ok">{{ h.status }}</span>
        </div>
      </div></div></div>

      <!-- Pending work -->
      <div class="col-lg-7"><div class="card h-100"><div class="card-body">
        <div class="section-title mb-2">Pending work</div>
        <div class="row g-2" *ngIf="pending() as p">
          <div class="col-6 col-md-4" *ngFor="let c of pendingCards(p.counts)">
            <a class="surface d-block p-2 text-decoration-none text-reset" [routerLink]="c.link">
              <div class="d-flex justify-content-between align-items-center">
                <span class="small text-muted-2">{{ c.label }}</span>
                <span class="fw-bold" [class.text-danger]="c.danger && c.value > 0" style="font-size:18px">{{ c.value }}</span>
              </div>
            </a>
          </div>
        </div>
      </div></div></div>
    </div>

    <!-- Overdue tasks -->
    <div class="card mt-3" *ngIf="pending() as p"><div class="card-body">
      <div class="section-title mb-2">Overdue designer tasks</div>
      <div class="table-responsive" *ngIf="p.overdueTasks?.length; else none">
        <table class="table">
          <thead><tr><th>Task</th><th>Campaign</th><th>Designer</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let t of p.overdueTasks">
              <td class="fw-500">{{ t.title }}<div class="small text-muted-2">{{ t.taskCode }}</div></td>
              <td class="small">{{ t.campaign?.name || '—' }}</td>
              <td class="small">{{ t.assignee?.name || 'Unassigned' }}</td>
              <td class="small text-danger">{{ t.dueDate | date:'MMM d' }}</td>
              <td><app-status-badge [status]="t.status"></app-status-badge></td>
              <td><a class="btn btn-sm btn-outline-primary" [routerLink]="['/admin/tasks', t.id]">View</a></td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #none><div class="empty-state"><i class="bi bi-check2-circle"></i><p class="mb-0 mt-2">No overdue tasks — good job.</p></div></ng-template>
    </div></div>
  `,
})
export class PendingComponent implements OnInit {
  private dash = inject(DashboardService);
  pending = signal<any>(null);
  health = signal<any[]>([]);
  today = signal<any>(null);

  ngOnInit() {
    this.dash.pending().subscribe((p) => this.pending.set(p));
    this.dash.businessHealth().subscribe((h) => this.health.set(h));
    this.dash.today().subscribe((t) => this.today.set(t));
  }

  pendingCards(c: any) {
    return [
      { label: 'Pending tasks', value: c.pendingTasks, link: '/admin/tasks', danger: false },
      { label: 'Pending reviews', value: c.pendingReviews, link: '/admin/tasks', danger: false },
      { label: 'Revision required', value: c.revisionRequired, link: '/admin/tasks', danger: true },
      { label: 'Overdue tasks', value: c.overdueTasks, link: '/admin/tasks', danger: true },
      { label: 'Follow-ups overdue', value: c.pendingFollowups, link: '/admin/telecalling', danger: true },
      { label: 'Uncontacted leads', value: c.uncontactedLeads, link: '/admin/leads', danger: false },
      { label: 'Payment pending', value: c.paymentPending, link: '/admin/transactions', danger: true },
    ];
  }
}
