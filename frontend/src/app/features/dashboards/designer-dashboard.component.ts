import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { SocketService } from '../../core/socket.service';
import { KpiCardComponent, ProgressBarComponent, StatusBadgeComponent } from '../../shared/ui';
import { Task } from '../../core/models';

@Component({
  selector: 'app-designer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, KpiCardComponent, ProgressBarComponent, StatusBadgeComponent],
  template: `
    <div class="page-title mb-1">{{ greeting }}, {{ firstName }}</div>
    <div class="text-muted-2 mb-3">Here's your work for today.</div>

    <div class="row g-3 mb-1">
      <div class="col-6 col-lg"><app-kpi label="Assigned" [value]="c().assigned" icon="inbox" tone="blue"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="In Progress" [value]="c().inProgress" icon="pencil-square" tone="amber"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Pending Review" [value]="c().review" icon="hourglass-split" tone="primary"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Completed" [value]="c().completed" icon="check2-circle" tone="green"></app-kpi></div>
      <div class="col-6 col-lg"><app-kpi label="Overdue" [value]="c().overdue" icon="exclamation-triangle" tone="red"></app-kpi></div>
    </div>

    <div class="card mt-3"><div class="card-body">
      <div class="section-title mb-3">Today's tasks</div>
      <div class="table-responsive" *ngIf="tasks().length; else empty">
        <table class="table">
          <thead><tr><th>Task</th><th>Campaign</th><th>Priority</th><th>Due</th><th style="width:180px">Progress</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let t of tasks()">
              <td class="fw-500">{{ t.title }}<div class="small text-muted-2">{{ t.taskCode }}</div></td>
              <td class="small">{{ t.campaign?.name || '—' }}</td>
              <td><span class="dot" [ngClass]="'p-' + t.priority.toLowerCase()"></span> <span class="small">{{ t.priority | titlecase }}</span></td>
              <td class="small" [class.text-danger]="overdue(t)">{{ t.dueDate ? (t.dueDate | date:'MMM d') : '—' }}</td>
              <td><app-progress [value]="t.progress"></app-progress></td>
              <td><app-status-badge [status]="t.status"></app-status-badge></td>
              <td><a class="btn btn-sm btn-outline-primary" [routerLink]="['/designer/tasks', t.id]">Open</a></td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-inbox"></i><p class="mb-0 mt-2">No tasks assigned yet.</p></div></ng-template>
    </div></div>
  `,
})
export class DesignerDashboardComponent implements OnInit {
  private taskService = inject(TaskService);
  private auth = inject(AuthService);
  private socket = inject(SocketService);

  tasks = signal<Task[]>([]);
  c = computed(() => {
    const t = this.tasks();
    const inSet = (s: string[], x: string) => s.includes(x);
    return {
      assigned: t.length,
      inProgress: t.filter((x) => inSet(['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUIRED'], x.status)).length,
      review: t.filter((x) => inSet(['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'], x.status)).length,
      completed: t.filter((x) => inSet(['APPROVED', 'PUBLISHED', 'COMPLETED'], x.status)).length,
      overdue: t.filter((x) => this.overdue(x)).length,
    };
  });

  get firstName() { return this.auth.user()?.name?.split(' ')[0] ?? ''; }
  get greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

  ngOnInit() {
    this.load();
    ['task.assigned', 'task.revision_requested', 'task.approved'].forEach((ev) =>
      this.socket.on(ev).subscribe(() => this.load()));
  }

  load() { this.taskService.list({ limit: 100 }).subscribe((r) => this.tasks.set(r.items)); }

  overdue(t: Task) {
    return !!t.dueDate && new Date(t.dueDate) < new Date() && !['APPROVED', 'PUBLISHED', 'COMPLETED'].includes(t.status);
  }
}
