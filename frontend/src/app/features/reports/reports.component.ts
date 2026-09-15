import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-title mb-3">Reports</div>

    <div class="card mb-3"><div class="card-body">
      <div class="row g-2 align-items-end">
        <div class="col-md-5">
          <label class="small fw-500">Report</label>
          <select class="form-select form-select-sm" [(ngModel)]="type" (change)="load()">
            <option *ngFor="let r of reports" [value]="r.key">{{ r.label }}</option>
          </select>
        </div>
        <div class="col-md-3">
          <button *ngIf="auth.has('reports.export')" class="btn btn-sm btn-outline-primary" (click)="exportCsv()">
            <i class="bi bi-download"></i> Export CSV
          </button>
        </div>
      </div>
    </div></div>

    <div class="card"><div class="card-body p-0">
      <div class="table-responsive" *ngIf="rows().length; else empty">
        <table class="table">
          <thead><tr><th *ngFor="let c of columns()">{{ pretty(c) }}</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of rows()"><td *ngFor="let c of columns()">{{ row[c] }}</td></tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-file-earmark-bar-graph"></i><p class="mb-0 mt-2">No data for this report yet.</p></div></ng-template>
    </div></div>
  `,
})
export class ReportsComponent implements OnInit {
  private service = inject(ReportService);
  auth = inject(AuthService);
  reports = [
    { key: 'campaign-performance', label: 'Campaign performance' },
    { key: 'telecaller-performance', label: 'Telecaller performance' },
    { key: 'not-interested', label: 'Not-interested report' },
    { key: 'lead-sources', label: 'Lead source performance' },
  ];
  type = 'campaign-performance';
  rows = signal<any[]>([]);

  ngOnInit() { this.load(); }
  load() { this.service.data(this.type).subscribe((r) => this.rows.set(r ?? [])); }
  columns() { return this.rows().length ? Object.keys(this.rows()[0]).filter((k) => k !== 'id') : []; }
  pretty(s: string) { return s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()); }

  exportCsv() {
    this.service.exportCsv(this.type).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${this.type}.csv`; a.click();
      URL.revokeObjectURL(url);
    });
  }
}
