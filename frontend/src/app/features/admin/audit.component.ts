import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../core/data.services';
import { Paginated } from '../../core/models';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-title mb-3">Audit logs</div>
    <div class="card"><div class="card-body p-0">
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr></thead>
          <tbody>
            <tr *ngFor="let a of data()?.items">
              <td class="small">{{ a.createdAt | date:'MMM d, HH:mm:ss' }}</td>
              <td><span class="badge-status s-grey">{{ a.action }}</span></td>
              <td class="small">{{ a.entityType }}</td>
              <td class="small text-muted-2">{{ a.entityId }}</td>
            </tr>
            <tr *ngIf="!data()?.items?.length"><td colspan="4" class="text-center text-muted-2 py-4">No audit records yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div></div>

    <div class="d-flex justify-content-between align-items-center mt-3" *ngIf="(data()?.pages ?? 1) > 1">
      <span class="small text-muted-2">{{ data()?.total }} records</span>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-secondary" [disabled]="page === 1" (click)="go(page - 1)">Prev</button>
        <button class="btn btn-outline-secondary" disabled>{{ page }} / {{ data()?.pages }}</button>
        <button class="btn btn-outline-secondary" [disabled]="page >= (data()?.pages ?? 1)" (click)="go(page + 1)">Next</button>
      </div>
    </div>
  `,
})
export class AuditComponent implements OnInit {
  private service = inject(AuditService);
  data = signal<Paginated<any> | null>(null);
  page = 1;
  ngOnInit() { this.load(); }
  load() { this.service.list({ page: this.page, limit: 30 }).subscribe((r) => this.data.set(r)); }
  go(p: number) { this.page = p; this.load(); }
}
