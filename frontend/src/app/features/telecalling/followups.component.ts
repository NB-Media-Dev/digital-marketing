import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelecallingService } from '../../core/data.services';

@Component({
  selector: 'app-followups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-title mb-3">Follow-ups</div>
    <div class="btn-group btn-group-sm mb-3">
      <button *ngFor="let b of buckets" class="btn"
              [class.btn-primary]="bucket() === b.key" [class.btn-outline-secondary]="bucket() !== b.key"
              (click)="setBucket(b.key)">{{ b.label }}</button>
    </div>

    <div class="card"><div class="card-body p-0">
      <div class="table-responsive" *ngIf="rows().length; else empty">
        <table class="table">
          <thead><tr><th>Lead</th><th>Phone</th><th>Follow-up</th><th>Remarks</th><th>Action</th></tr></thead>
          <tbody>
            <tr *ngFor="let f of rows()">
              <td class="fw-500">{{ f.lead?.name || f.leadId }}</td>
              <td class="small">{{ f.lead?.mobile || '—' }}</td>
              <td class="small" [class.text-danger]="isOverdue(f)">{{ f.followupDate | date:'MMM d, HH:mm' }}</td>
              <td class="small text-muted-2">{{ f.remarks || '—' }}</td>
              <td>
                <button class="btn btn-sm btn-outline-primary me-1" (click)="quickCall(f)">Log call</button>
                <button class="btn btn-sm btn-outline-success" (click)="complete(f)">Done</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-check2-circle"></i><p class="mb-0 mt-2">You're all caught up.</p></div></ng-template>
    </div></div>
  `,
})
export class FollowupsComponent implements OnInit {
  private service = inject(TelecallingService);
  buckets = [{ key: 'today', label: 'Today' }, { key: 'overdue', label: 'Overdue' }, { key: 'upcoming', label: 'Upcoming' }];
  bucket = signal('today');
  rows = signal<any[]>([]);

  ngOnInit() { this.load(); }
  setBucket(b: string) { this.bucket.set(b); this.load(); }
  load() { this.service.followups(this.bucket()).subscribe((r) => this.rows.set(r)); }
  isOverdue(f: any) { return new Date(f.followupDate) < new Date(); }
  complete(f: any) { this.service.completeFollowup(f.id).subscribe(() => this.load()); }
  quickCall(f: any) {
    this.service.logCall({ leadId: f.leadId, outcome: 'CONNECTED', remarks: 'Follow-up call' }).subscribe(() => this.load());
  }
}
