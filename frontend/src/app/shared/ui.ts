import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Maps a status string to a badge colour class + readable label. */
export function statusClass(status: string): string {
  const s = (status || '').toUpperCase();
  if (['COMPLETED', 'APPROVED', 'PUBLISHED', 'PAID', 'CONVERTED', 'QUALIFIED', 'INTERESTED', 'CONFIRMED', 'RUNNING', 'ACTIVE', 'DONE', 'AVAILABLE'].includes(s)) return 's-green';
  if (['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED', 'ASSIGNED', 'ACCEPTED', 'CONTACTED', 'NEW', 'SCHEDULED'].includes(s)) return 's-blue';
  if (['IN_PROGRESS', 'FOLLOW_UP', 'PENDING', 'PAUSED', 'BUSY'].includes(s)) return 's-amber';
  if (['REVISION_REQUIRED', 'NOT_INTERESTED', 'LOST', 'FAILED', 'OVERLOADED', 'DISABLED', 'REFUNDED'].includes(s)) return 's-red';
  if (['HIGH', 'NORMAL'].includes(s)) return 's-purple';
  return 's-grey';
}

export function pretty(status: string): string {
  return (status || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge-status" [ngClass]="cls">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  @Input() set status(v: string) { this.cls = statusClass(v); this.label = pretty(v); }
  cls = 's-grey';
  label = '';
}

@Component({
  selector: 'app-kpi',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card kpi h-100">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="kpi-label">{{ label }}</div>
          <div class="kpi-value">{{ value }}</div>
          <div class="small text-muted-2" *ngIf="hint">{{ hint }}</div>
        </div>
        <div class="kpi-icon" [ngStyle]="{ background: bg, color: fg }"><i class="bi" [ngClass]="'bi-' + icon"></i></div>
      </div>
    </div>`,
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value: string | number | null = '';
  @Input() hint = '';
  @Input() icon = 'bar-chart';
  @Input() tone: 'primary' | 'green' | 'amber' | 'red' | 'blue' = 'primary';
  get bg() { return { primary: '#FEEEE8', green: '#ECFDF3', amber: '#FFFAEB', red: '#FEF3F2', blue: '#EFF6FF' }[this.tone]; }
  get fg() { return { primary: '#F45B2A', green: '#159A78', amber: '#B54708', red: '#B42318', blue: '#1D4ED8' }[this.tone]; }
}

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center gap-2">
      <div class="progress flex-grow-1"><div class="progress-bar" [style.width.%]="value"></div></div>
      <span class="small text-muted-2" style="min-width:34px">{{ value }}%</span>
    </div>`,
})
export class ProgressBarComponent { @Input() value = 0; }

@Component({
  selector: 'app-empty',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <i class="bi" [ngClass]="'bi-' + icon"></i>
      <p class="mb-0 mt-2">{{ text }}</p>
    </div>`,
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() text = 'Nothing here yet.';
}
