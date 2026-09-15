import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelecallingService } from '../../core/data.services';
import { StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-calls',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  template: `
    <div class="page-title mb-3">Call history</div>
    <div class="card"><div class="card-body p-0">
      <div class="table-responsive" *ngIf="rows().length; else empty">
        <table class="table">
          <thead><tr><th>Lead</th><th>Date</th><th>Duration</th><th>Outcome</th><th>Remarks</th></tr></thead>
          <tbody>
            <tr *ngFor="let c of rows()">
              <td class="fw-500">{{ c.lead?.name || c.leadId }}</td>
              <td class="small">{{ c.callDate | date:'MMM d, HH:mm' }}</td>
              <td class="small">{{ c.duration }}s</td>
              <td><app-status-badge [status]="c.outcome"></app-status-badge></td>
              <td class="small text-muted-2">{{ c.remarks || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-telephone"></i><p class="mb-0 mt-2">No calls logged yet.</p></div></ng-template>
    </div></div>
  `,
})
export class CallsComponent implements OnInit {
  private service = inject(TelecallingService);
  rows = signal<any[]>([]);
  ngOnInit() { this.service.calls().subscribe((r) => this.rows.set(r)); }
}
