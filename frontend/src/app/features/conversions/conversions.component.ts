import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversionService, LeadService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-conversions',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="page-title">Conversions</div>
      <button *ngIf="auth.has('conversions.update')" class="btn btn-sm btn-primary" (click)="showForm = !showForm">
        <i class="bi bi-plus-lg"></i> Record conversion
      </button>
    </div>

    <div *ngIf="showForm" class="card mb-3"><div class="card-body">
      <div class="row g-2 align-items-end">
        <div class="col-md-5">
          <label class="small fw-500">Qualified lead</label>
          <select class="form-select form-select-sm" [(ngModel)]="form.leadId">
            <option value="">Choose a lead…</option>
            <option *ngFor="let l of qualifiedLeads()" [value]="l.id">{{ l.name }} — {{ l.leadCode }}</option>
          </select>
        </div>
        <div class="col-md-3"><label class="small fw-500">Amount (₹)</label>
          <input class="form-control form-control-sm" type="number" [(ngModel)]="form.amount" /></div>
        <div class="col-md-2"><button class="btn btn-sm btn-primary w-100" [disabled]="!form.leadId || !form.amount" (click)="create()">Save</button></div>
      </div>
    </div></div>

    <div class="card"><div class="card-body p-0">
      <div class="table-responsive" *ngIf="rows().length; else empty">
        <table class="table">
          <thead><tr><th>Code</th><th>Lead</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let c of rows()">
              <td class="small">{{ c.conversionCode }}</td><td class="fw-500">{{ c.lead?.name }}</td>
              <td>₹{{ c.amount | number }}</td><td class="small">{{ c.conversionDate | date:'MMM d' }}</td>
              <td><app-status-badge [status]="c.status"></app-status-badge></td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-graph-up-arrow"></i><p class="mb-0 mt-2">No conversions recorded yet.</p></div></ng-template>
    </div></div>
  `,
})
export class ConversionsComponent implements OnInit {
  private service = inject(ConversionService);
  private leads = inject(LeadService);
  auth = inject(AuthService);
  rows = signal<any[]>([]);
  qualifiedLeads = signal<any[]>([]);
  showForm = false;
  form: any = { leadId: '', amount: 0 };

  ngOnInit() { this.load(); this.leads.list({ status: 'QUALIFIED', limit: 100 }).subscribe((r) => this.qualifiedLeads.set(r.items)); }
  load() { this.service.list().subscribe((r) => this.rows.set(r)); }
  create() { this.service.create(this.form).subscribe(() => { this.showForm = false; this.form = { leadId: '', amount: 0 }; this.load(); }); }
}
