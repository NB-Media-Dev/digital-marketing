import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DesignerService } from '../../core/data.services';
import { ProgressBarComponent, StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-designer-list',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, ProgressBarComponent],
  template: `
    <div class="page-title mb-3">Designers</div>
    <div class="card"><div class="card-body p-0">
      <div class="table-responsive" *ngIf="rows().length; else empty">
        <table class="table">
          <thead><tr><th>Designer</th><th>Team</th><th>Active</th><th>Completed</th><th>Pending Review</th><th>Overdue</th><th style="width:150px">Completion</th><th>Workload</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let d of rows()">
              <td><div class="d-flex align-items-center gap-2"><div class="avatar">{{ initials(d.name) }}</div>
                <div><div class="fw-500">{{ d.name }}</div><div class="small text-muted-2">{{ d.employeeCode }}</div></div></div></td>
              <td class="small">{{ d.team }}</td><td>{{ d.active }}</td><td>{{ d.completed }}</td>
              <td>{{ d.pendingReview }}</td><td [class.text-danger]="d.overdue > 0">{{ d.overdue }}</td>
              <td><app-progress [value]="d.completionRate"></app-progress></td>
              <td><app-status-badge [status]="d.workload"></app-status-badge></td>
              <td><app-status-badge [status]="d.status"></app-status-badge></td>
              <td><a class="btn btn-sm btn-outline-primary" [routerLink]="['/admin/designers', d.id]">View</a></td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-people"></i><p class="mb-0 mt-2">No designers yet.</p></div></ng-template>
    </div></div>
  `,
})
export class DesignerListComponent implements OnInit {
  private service = inject(DesignerService);
  rows = signal<any[]>([]);
  ngOnInit() { this.service.list().subscribe((r) => this.rows.set(r)); }
  initials(n: string) { return (n ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(); }
}
