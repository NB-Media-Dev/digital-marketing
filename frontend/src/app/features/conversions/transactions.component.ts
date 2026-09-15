import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversionService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="page-title">Transactions</div>
      <button *ngIf="auth.has('transactions.update')" class="btn btn-sm btn-primary" (click)="showForm = !showForm">
        <i class="bi bi-plus-lg"></i> Record payment
      </button>
    </div>

    <div *ngIf="showForm" class="card mb-3"><div class="card-body">
      <div class="row g-2 align-items-end">
        <div class="col-md-4"><label class="small fw-500">Conversion</label>
          <select class="form-select form-select-sm" [(ngModel)]="form.conversionId">
            <option value="">Choose…</option>
            <option *ngFor="let c of conversions()" [value]="c.id">{{ c.conversionCode }} — {{ c.lead?.name }}</option>
          </select></div>
        <div class="col-md-2"><label class="small fw-500">Amount</label>
          <input class="form-control form-control-sm" type="number" [(ngModel)]="form.amount" /></div>
        <div class="col-md-2"><label class="small fw-500">Method</label>
          <select class="form-select form-select-sm" [(ngModel)]="form.paymentMethod">
            <option>UPI</option><option>CARD</option><option>CASH</option><option>BANK_TRANSFER</option>
          </select></div>
        <div class="col-md-2"><label class="small fw-500">Status</label>
          <select class="form-select form-select-sm" [(ngModel)]="form.paymentStatus">
            <option>PENDING</option><option>PAID</option>
          </select></div>
        <div class="col-md-2"><button class="btn btn-sm btn-primary w-100" [disabled]="!form.conversionId" (click)="create()">Save</button></div>
      </div>
    </div></div>

    <div class="card"><div class="card-body p-0">
      <div class="table-responsive" *ngIf="rows().length; else empty">
        <table class="table">
          <thead><tr><th>Code</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th *ngIf="auth.has('transactions.update')"></th></tr></thead>
          <tbody>
            <tr *ngFor="let t of rows()">
              <td class="small">{{ t.transactionCode }}</td><td>₹{{ t.amount | number }}</td>
              <td class="small">{{ t.paymentMethod }}</td><td><app-status-badge [status]="t.paymentStatus"></app-status-badge></td>
              <td class="small">{{ t.paymentDate ? (t.paymentDate | date:'MMM d') : '—' }}</td>
              <td *ngIf="auth.has('transactions.update')">
                <button *ngIf="t.paymentStatus === 'PENDING'" class="btn btn-sm btn-outline-success" (click)="markPaid(t)">Mark paid</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-credit-card"></i><p class="mb-0 mt-2">No transactions yet.</p></div></ng-template>
    </div></div>
  `,
})
export class TransactionsComponent implements OnInit {
  private service = inject(ConversionService);
  auth = inject(AuthService);
  rows = signal<any[]>([]);
  conversions = signal<any[]>([]);
  showForm = false;
  form: any = { conversionId: '', amount: 0, paymentMethod: 'UPI', paymentStatus: 'PENDING' };

  ngOnInit() { this.load(); this.service.list().subscribe((r) => this.conversions.set(r)); }
  load() { this.service.transactions().subscribe((r) => this.rows.set(r)); }
  create() { this.service.createTransaction(this.form).subscribe(() => { this.showForm = false; this.load(); }); }
  markPaid(t: any) { this.service.updateTransaction(t.id, 'PAID').subscribe(() => this.load()); }
}
