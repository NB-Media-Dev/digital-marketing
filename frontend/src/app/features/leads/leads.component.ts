import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LeadService, TelecallingService, UserService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { StatusBadgeComponent } from '../../shared/ui';
import { Paginated } from '../../core/models';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="page-title mb-3">Leads</div>

    <!-- Funnel strip -->
    <div class="row g-2 mb-3" *ngIf="funnel() as f">
      <div class="col-6 col-md" *ngFor="let s of funnelSteps(f)">
        <div class="card"><div class="card-body py-2 text-center">
          <div class="small text-muted-2">{{ s.label }}</div>
          <div class="fw-bold" style="font-size:20px">{{ s.value | number }}</div>
          <div class="small text-muted-2" *ngIf="s.rate !== null">{{ s.rate }}%</div>
        </div></div>
      </div>
    </div>

    <div class="card mb-3"><div class="card-body py-2">
      <div class="row g-2">
        <div class="col-md-4"><div class="input-group input-group-sm">
          <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
          <input class="form-control" placeholder="Search name / mobile…" [(ngModel)]="search" (keyup.enter)="load()" />
        </div></div>
        <div class="col-md-3"><select class="form-select form-select-sm" [(ngModel)]="status" (change)="load()">
          <option value="">All statuses</option>
          <option *ngFor="let s of statuses" [value]="s">{{ pretty(s) }}</option>
        </select></div>
        <div class="col-md-3"><select class="form-select form-select-sm" [(ngModel)]="source" (change)="load()">
          <option value="">All sources</option>
          <option *ngFor="let s of sources" [value]="s">{{ s }}</option>
        </select></div>
      </div>
    </div></div>

    <div class="card"><div class="card-body p-0">
      <div class="table-responsive" *ngIf="data()?.items?.length; else empty">
        <table class="table">
          <thead><tr><th>Lead</th><th>Source</th><th>Campaign</th><th>Telecaller</th><th>Status</th><th *ngIf="canUpdate">Update</th><th *ngIf="canAssign">Assign</th></tr></thead>
          <tbody>
            <tr *ngFor="let l of data()?.items">
              <td><div class="fw-500">{{ l.name }}</div><div class="small text-muted-2">{{ l.mobile }}</div></td>
              <td class="small">{{ l.source }}</td>
              <td class="small">{{ l.campaign?.name || '—' }}</td>
              <td class="small">{{ l.telecaller?.name || '—' }}</td>
              <td><app-status-badge [status]="l.status"></app-status-badge></td>
              <td *ngIf="canUpdate">
                <select class="form-select form-select-sm" style="width:150px" [ngModel]="l.status" (ngModelChange)="updateStatus(l, $event)">
                  <option *ngFor="let s of statuses" [value]="s">{{ pretty(s) }}</option>
                </select>
              </td>
              <td *ngIf="canAssign">
                <select class="form-select form-select-sm" style="width:150px" [ngModel]="l.assignedTo" (ngModelChange)="assign(l, $event)">
                  <option [ngValue]="null">Unassigned</option>
                  <option *ngFor="let t of telecallers()" [value]="t.id">{{ t.name }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty><div class="empty-state"><i class="bi bi-person-lines-fill"></i><p class="mb-0 mt-2">No leads found for this period.</p></div></ng-template>
    </div></div>
  `,
})
export class LeadsComponent implements OnInit {
  private service = inject(LeadService);
  private users = inject(UserService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  data = signal<Paginated<any> | null>(null);
  funnel = signal<any>(null);
  telecallers = signal<any[]>([]);
  statuses = ['NEW', 'ASSIGNED', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP', 'QUALIFIED', 'CONVERTED', 'LOST'];
  sources = ['META', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'WEBSITE', 'WHATSAPP', 'MANUAL', 'OTHER'];
  search = ''; status = ''; source = '';

  get canUpdate() { return this.auth.has('leads.update'); }
  get canAssign() { return this.auth.has('leads.assign'); }

  ngOnInit() {
    if (this.route.snapshot.data['qualified']) this.status = 'QUALIFIED';
    this.load();
    this.service.funnel().subscribe((f) => this.funnel.set(f));
    if (this.canAssign) this.users.list('TELECALLER').subscribe((t) => this.telecallers.set(t));
  }

  load() {
    this.service.list({ search: this.search, status: this.status, source: this.source, limit: 50 })
      .subscribe((r) => this.data.set(r));
  }

  funnelSteps(f: any) {
    return [
      { label: 'Generated', value: f.generated, rate: null },
      { label: 'Contacted', value: f.contacted, rate: f.contactedRate },
      { label: 'Interested', value: f.interested, rate: f.interestedRate },
      { label: 'Qualified', value: f.qualified, rate: f.qualifiedRate },
      { label: 'Converted', value: f.converted, rate: f.conversionRate },
    ];
  }

  updateStatus(lead: any, status: string) {
    this.service.updateStatus(lead.id, status).subscribe(() => { lead.status = status; });
  }
  assign(lead: any, telecallerId: string) {
    if (!telecallerId) return;
    this.service.assign(lead.id, telecallerId).subscribe(() => this.load());
  }
  pretty(s: string) { return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
}
