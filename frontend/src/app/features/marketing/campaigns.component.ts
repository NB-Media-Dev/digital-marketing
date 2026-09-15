import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketingService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="page-title">Campaigns</div>
      <button *ngIf="auth.has('campaigns.create')" class="btn btn-sm btn-primary" (click)="showForm = !showForm">
        <i class="bi bi-plus-lg"></i> New campaign
      </button>
    </div>

    <div *ngIf="showForm" class="card mb-3"><div class="card-body">
      <div class="row g-2">
        <div class="col-md-5"><input class="form-control form-control-sm" placeholder="Campaign name" [(ngModel)]="form.name" /></div>
        <div class="col-md-3"><input class="form-control form-control-sm" placeholder="Objective" [(ngModel)]="form.objective" /></div>
        <div class="col-md-2"><input class="form-control form-control-sm" type="number" placeholder="Budget" [(ngModel)]="form.budget" /></div>
        <div class="col-md-2"><button class="btn btn-sm btn-primary w-100" [disabled]="!form.name" (click)="create()">Create</button></div>
      </div>
    </div></div>

    <div class="card"><div class="card-body p-0">
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Campaign</th><th>Status</th><th>Spend</th><th>Leads</th><th>CPL</th><th>Qualified</th><th>Conversions</th><th>Conv. Rate</th></tr></thead>
          <tbody>
            <tr *ngFor="let c of rows()">
              <td class="fw-500">{{ c.name }}</td><td><app-status-badge [status]="c.status"></app-status-badge></td>
              <td>₹{{ c.spend | number }}</td><td>{{ c.leads | number }}</td><td>₹{{ c.cpl }}</td>
              <td>{{ c.qualified }}</td><td>{{ c.conversions }}</td><td>{{ c.conversionRate }}%</td>
            </tr>
            <tr *ngIf="!rows().length"><td colspan="8" class="text-center text-muted-2 py-4">No campaigns yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div></div>
  `,
})
export class CampaignsComponent implements OnInit {
  private service = inject(MarketingService);
  auth = inject(AuthService);
  rows = signal<any[]>([]);
  showForm = false;
  form: any = { name: '', objective: '', budget: 0 };

  ngOnInit() { this.load(); }
  load() { this.service.campaignPerformance().subscribe((r) => this.rows.set(r)); }
  create() {
    this.service.createCampaign(this.form).subscribe(() => { this.showForm = false; this.form = { name: '', objective: '', budget: 0 }; this.load(); });
  }
}
