import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelecallingService } from '../../core/data.services';

@Component({
  selector: 'app-telecaller-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-title mb-3">Telecalling performance</div>
    <div class="card"><div class="card-body p-0">
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Telecaller</th><th>Assigned</th><th>Calls</th><th>Interested</th><th>Not Interested</th><th>Follow-ups</th><th>Qualified</th><th>Conversions</th><th>Conv. Rate</th><th>Not-Int. Ratio</th></tr></thead>
          <tbody>
            <tr *ngFor="let t of rows()">
              <td class="fw-500">{{ t.name }}</td><td>{{ t.assigned }}</td><td>{{ t.calls }}</td>
              <td>{{ t.interested }}</td><td>{{ t.notInterested }}</td><td>{{ t.followups }}</td>
              <td>{{ t.qualified }}</td><td>{{ t.conversions }}</td><td>{{ t.conversionRate }}%</td>
              <td><span [class.text-danger]="t.notInterestedRatio > 50" [class.fw-600]="t.notInterestedRatio > 50">{{ t.notInterestedRatio }}%</span></td>
            </tr>
            <tr *ngIf="!rows().length"><td colspan="10" class="text-center text-muted-2 py-4">No telecalling activity yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div></div>
  `,
})
export class TelecallerBoardComponent implements OnInit {
  private service = inject(TelecallingService);
  rows = signal<any[]>([]);
  ngOnInit() { this.service.board().subscribe((r) => this.rows.set(r)); }
}
