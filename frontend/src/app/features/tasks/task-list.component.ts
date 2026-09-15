import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TaskService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { ProgressBarComponent, StatusBadgeComponent } from '../../shared/ui';
import { Paginated, Task } from '../../core/models';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, ProgressBarComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="page-title">{{ title }}</div>
    </div>

    <div class="card mb-3"><div class="card-body py-2">
      <div class="row g-2 align-items-center">
        <div class="col-md-4">
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
            <input class="form-control" placeholder="Search tasks…" [(ngModel)]="search" (keyup.enter)="load()" />
          </div>
        </div>
        <div class="col-md-3">
          <select class="form-select form-select-sm" [(ngModel)]="status" (change)="load()">
            <option value="">All statuses</option>
            <option *ngFor="let s of statuses" [value]="s">{{ pretty(s) }}</option>
          </select>
        </div>
        <div class="col-md-3">
          <select class="form-select form-select-sm" [(ngModel)]="priority" (change)="load()">
            <option value="">All priorities</option>
            <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option>
          </select>
        </div>
      </div>
    </div></div>

    <div class="card"><div class="card-body p-0">
      <div class="table-responsive" *ngIf="data()?.items?.length; else empty">
        <table class="table">
          <thead><tr><th>Task</th><th>Campaign</th><th>Assignee</th><th>Priority</th><th>Due</th><th style="width:160px">Progress</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let t of data()?.items">
              <td class="fw-500">{{ t.title }}<div class="small text-muted-2">{{ t.taskCode }}</div></td>
              <td class="small">{{ t.campaign?.name || '—' }}</td>
              <td class="small">{{ t.assignee?.name || 'Unassigned' }}</td>
              <td><span class="dot" [ngClass]="'p-' + t.priority.toLowerCase()"></span> <span class="small">{{ t.priority | titlecase }}</span></td>
              <td class="small" [class.text-danger]="overdue(t)">{{ t.dueDate ? (t.dueDate | date:'MMM d') : '—' }}</td>
              <td><app-progress [value]="t.progress"></app-progress></td>
              <td><app-status-badge [status]="t.status"></app-status-badge></td>
              <td><a class="btn btn-sm btn-outline-primary" [routerLink]="[base, t.id]">View</a></td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-kanban"></i><p class="mb-0 mt-2">No tasks found for this view.</p></div></ng-template>
    </div></div>

    <div class="d-flex justify-content-between align-items-center mt-3" *ngIf="(data()?.pages ?? 1) > 1">
      <span class="small text-muted-2">{{ data()?.total }} tasks</span>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-secondary" [disabled]="page === 1" (click)="go(page - 1)">Prev</button>
        <button class="btn btn-outline-secondary" disabled>{{ page }} / {{ data()?.pages }}</button>
        <button class="btn btn-outline-secondary" [disabled]="page >= (data()?.pages ?? 1)" (click)="go(page + 1)">Next</button>
      </div>
    </div>
  `,
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  data = signal<Paginated<Task> | null>(null);
  statuses = ['DRAFT', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'RESUBMITTED', 'APPROVED', 'PUBLISHED', 'COMPLETED'];
  search = ''; status = ''; priority = ''; page = 1;
  bucket = '';

  get base() { return this.auth.hasRole('DESIGNER') ? '/designer/tasks' : '/admin/tasks'; }
  get title() {
    if (this.bucket === 'pending_review') return 'Pending Review';
    if (this.bucket === 'completed') return 'Completed';
    return this.auth.hasRole('DESIGNER') ? 'My Tasks' : 'Tasks';
  }

  ngOnInit() {
    this.bucket = this.route.snapshot.data['bucket'] ?? '';
    this.load();
  }

  load() {
    this.taskService.list({ search: this.search, status: this.status, priority: this.priority, bucket: this.bucket, page: this.page })
      .subscribe((r) => this.data.set(r));
  }
  go(p: number) { this.page = p; this.load(); }
  overdue(t: Task) { return !!t.dueDate && new Date(t.dueDate) < new Date() && !['APPROVED', 'PUBLISHED', 'COMPLETED'].includes(t.status); }
  pretty(s: string) { return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
}
