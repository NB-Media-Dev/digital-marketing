import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="page-title">Users &amp; Roles</div>
      <button *ngIf="auth.has('users.create')" class="btn btn-sm btn-primary" (click)="showForm = !showForm"><i class="bi bi-plus-lg"></i> New user</button>
    </div>

    <div *ngIf="showForm" class="card mb-3"><div class="card-body">
      <div *ngIf="error()" class="alert alert-danger py-2 small">{{ error() }}</div>
      <div class="row g-2 align-items-end">
        <div class="col-md-3"><label class="small fw-500">Name</label><input class="form-control form-control-sm" [(ngModel)]="form.name" /></div>
        <div class="col-md-3"><label class="small fw-500">Email</label><input class="form-control form-control-sm" [(ngModel)]="form.email" /></div>
        <div class="col-md-2"><label class="small fw-500">Password</label><input class="form-control form-control-sm" [(ngModel)]="form.password" /></div>
        <div class="col-md-2"><label class="small fw-500">Role</label>
          <select class="form-select form-select-sm" [(ngModel)]="form.roleCode">
            <option *ngFor="let r of roles" [value]="r">{{ pretty(r) }}</option>
          </select></div>
        <div class="col-md-2"><button class="btn btn-sm btn-primary w-100" (click)="create()">Create</button></div>
      </div>
    </div></div>

    <div class="card"><div class="card-body p-0">
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Name</th><th>Email</th><th>Employee</th><th>Role</th><th>Status</th><th *ngIf="auth.has('users.disable')"></th></tr></thead>
          <tbody>
            <tr *ngFor="let u of rows()">
              <td class="fw-500">{{ u.name }}</td><td class="small">{{ u.email }}</td><td class="small">{{ u.employeeCode }}</td>
              <td class="small">{{ u.role?.name }}</td><td><app-status-badge [status]="u.status"></app-status-badge></td>
              <td *ngIf="auth.has('users.disable')">
                <button *ngIf="u.status === 'ACTIVE'" class="btn btn-sm btn-outline-danger" (click)="disable(u)">Disable</button>
                <button *ngIf="u.status !== 'ACTIVE'" class="btn btn-sm btn-outline-success" (click)="enable(u)">Enable</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div></div>
  `,
})
export class UsersComponent implements OnInit {
  private service = inject(UserService);
  auth = inject(AuthService);
  rows = signal<any[]>([]);
  error = signal('');
  showForm = false;
  roles = ['ADMIN', 'DM_MANAGER', 'DIGITAL_MARKETING', 'DESIGNER', 'TELECALLER', 'CONVERSION_MANAGER'];
  form: any = { name: '', email: '', password: '', roleCode: 'DESIGNER' };

  ngOnInit() { this.load(); }
  load() { this.service.list().subscribe((r) => this.rows.set(r)); }
  create() {
    this.error.set('');
    this.service.create(this.form).subscribe({
      next: () => { this.showForm = false; this.form = { name: '', email: '', password: '', roleCode: 'DESIGNER' }; this.load(); },
      error: (e) => this.error.set(e?.error?.message ?? 'Could not create user.'),
    });
  }
  disable(u: any) { this.service.disable(u.id).subscribe(() => this.load()); }
  enable(u: any) { this.service.enable(u.id).subscribe(() => this.load()); }
  pretty(s: string) { return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
}
