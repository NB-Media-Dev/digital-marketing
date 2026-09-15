import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DesignerService } from '../../core/data.services';
import { KpiCardComponent, StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-designer-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, KpiCardComponent, StatusBadgeComponent],
  template: `
    <ng-container *ngIf="d() as v">
      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="avatar" style="width:52px;height:52px;font-size:18px">{{ initials(v.designer.name) }}</div>
        <div>
          <div class="page-title">{{ v.designer.name }}</div>
          <div class="text-muted-2">{{ v.designer.employeeCode }} · Micro-management view</div>
        </div>
      </div>

      <div class="row g-3 mb-1">
        <div class="col-6 col-lg"><app-kpi label="Assigned" [value]="v.assigned" icon="inbox" tone="blue"></app-kpi></div>
        <div class="col-6 col-lg"><app-kpi label="Completed" [value]="v.completed" icon="check2-circle" tone="green"></app-kpi></div>
        <div class="col-6 col-lg"><app-kpi label="In Progress" [value]="v.active" icon="pencil-square" tone="amber"></app-kpi></div>
        <div class="col-6 col-lg"><app-kpi label="Pending Review" [value]="v.pendingReview" icon="hourglass-split" tone="primary"></app-kpi></div>
        <div class="col-6 col-lg"><app-kpi label="Overdue" [value]="v.overdue" icon="exclamation-triangle" tone="red"></app-kpi></div>
      </div>

      <div class="row g-3 mb-1">
        <div class="col-6 col-lg-3"><app-kpi label="Completion Rate" [value]="v.completionRate + '%'" icon="graph-up" tone="green"></app-kpi></div>
        <div class="col-6 col-lg-3"><app-kpi label="On-Time Rate" [value]="v.onTimeRate + '%'" icon="clock" tone="blue"></app-kpi></div>
        <div class="col-6 col-lg-3"><app-kpi label="Revision Rate" [value]="v.revisionRate + '%'" icon="arrow-repeat" tone="amber"></app-kpi></div>
        <div class="col-6 col-lg-3"><app-kpi label="Avg Completion" [value]="v.avgCompletionHours + 'h'" icon="stopwatch" tone="primary"></app-kpi></div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-lg-7"><div class="card h-100"><div class="card-body">
          <div class="section-title mb-2">Task history</div>
          <div class="table-responsive"><table class="table">
            <thead><tr><th>Task</th><th>Campaign</th><th>Status</th><th>Progress</th></tr></thead>
            <tbody>
              <tr *ngFor="let t of v.taskHistory">
                <td class="fw-500">{{ t.title }}</td><td class="small">{{ t.campaign?.name || '—' }}</td>
                <td><app-status-badge [status]="t.status"></app-status-badge></td><td>{{ t.progress }}%</td>
              </tr>
            </tbody>
          </table></div>
        </div></div></div>

        <div class="col-lg-5"><div class="card h-100"><div class="card-body">
          <div class="section-title mb-3">Recent activity</div>
          <ul class="timeline">
            <li *ngFor="let a of v.recentActivity">
              <div class="t-time">{{ a.createdAt | date:'MMM d, HH:mm' }}</div>
              <div class="small">{{ a.description }}</div>
            </li>
          </ul>
          <div *ngIf="!v.recentActivity?.length" class="empty-state py-2"><i class="bi bi-clock-history"></i><p class="mb-0 mt-1">No recent activity.</p></div>
        </div></div></div>
      </div>
    </ng-container>
  `,
})
export class DesignerDetailComponent implements OnInit {
  private service = inject(DesignerService);
  private route = inject(ActivatedRoute);
  d = signal<any>(null);
  ngOnInit() { this.service.detail(this.route.snapshot.paramMap.get('id')!).subscribe((v) => this.d.set(v)); }
  initials(n: string) { return (n ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(); }
}
