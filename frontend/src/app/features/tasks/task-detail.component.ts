import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TaskService } from '../../core/data.services';
import { AuthService } from '../../core/auth.service';
import { SocketService } from '../../core/socket.service';
import { ProgressBarComponent, StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, ProgressBarComponent],
  template: `
    <ng-container *ngIf="d() as detail">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <div class="page-title">{{ detail.task.title }}</div>
          <div class="text-muted-2">
            {{ detail.task.taskCode }} · Due {{ detail.task.dueDate ? (detail.task.dueDate | date:'MMM d, y') : '—' }}
            · <span class="dot" [ngClass]="'p-' + detail.task.priority.toLowerCase()"></span> {{ detail.task.priority | titlecase }}
          </div>
        </div>
        <app-status-badge [status]="detail.task.status"></app-status-badge>
      </div>

      <div *ngIf="msg()" class="alert py-2 small" [ngClass]="err() ? 'alert-danger' : 'alert-success'">{{ msg() }}</div>

      <div class="row g-3">
        <div class="col-lg-8">
          <!-- Overview -->
          <div class="card mb-3"><div class="card-body">
            <div class="section-title mb-2">Overview</div>
            <p class="mb-2">{{ detail.task.description || 'No description provided.' }}</p>
            <div class="section-title mb-1 mt-3" style="font-size:14px">Requirements</div>
            <p class="text-muted-2 mb-3">{{ detail.task.requirements || '—' }}</p>
            <app-progress [value]="detail.task.progress"></app-progress>
          </div></div>

          <!-- Actions -->
          <div class="card mb-3"><div class="card-body">
            <div class="section-title mb-3">Actions</div>
            <div class="d-flex flex-wrap gap-2">
              <button *ngIf="can('ACCEPTED')" class="btn btn-sm btn-primary" (click)="run(task.accept(id))">Accept task</button>
              <button *ngIf="can('IN_PROGRESS')" class="btn btn-sm btn-primary" (click)="run(task.start(id))">Start work</button>
              <button *ngIf="isDesigner && inProgress" class="btn btn-sm btn-outline-primary" (click)="showProgress = !showProgress">Update progress</button>
              <button *ngIf="can('SUBMITTED') || can('RESUBMITTED')" class="btn btn-sm btn-primary" (click)="showSubmit = !showSubmit">Submit design</button>
              <button *ngIf="can('UNDER_REVIEW')" class="btn btn-sm btn-outline-primary" (click)="run(task.review(id))">Move to review</button>
              <button *ngIf="can('REVISION_REQUIRED')" class="btn btn-sm btn-outline-danger" (click)="showRevision = !showRevision">Request revision</button>
              <button *ngIf="can('APPROVED')" class="btn btn-sm btn-primary" (click)="run(task.approve(id))">Approve</button>
              <button *ngIf="can('PUBLISHED')" class="btn btn-sm btn-dark" (click)="run(task.publish(id))">Mark published</button>
              <button *ngIf="can('COMPLETED')" class="btn btn-sm btn-success" (click)="run(task.complete(id))">Complete</button>
            </div>

            <div *ngIf="showProgress" class="mt-3 p-3 surface">
              <label class="small fw-500">Progress: {{ progressVal }}%</label>
              <input type="range" class="form-range" min="0" max="100" step="5" [(ngModel)]="progressVal" />
              <button class="btn btn-sm btn-primary mt-2" (click)="run(task.progress(id, progressVal)); showProgress=false">Save progress</button>
            </div>

            <div *ngIf="showSubmit" class="mt-3 p-3 surface">
              <label class="small fw-500 d-block mb-1">Design file</label>
              <input type="file" class="form-control form-control-sm mb-2"
                     accept=".png,.jpg,.jpeg,.webp,.pdf,.psd,.ai,.fig,.zip"
                     (change)="onFile($event)" />
              <div class="small text-muted-2 mb-2">PNG, JPG, WEBP, PDF, PSD, AI, FIG or ZIP · up to 50 MB. A new version is created — previous versions are never overwritten.</div>
              <label class="small fw-500">Remarks</label>
              <input class="form-control form-control-sm mb-2" [(ngModel)]="submitRemarks" placeholder="What changed in this version?" />
              <button class="btn btn-sm btn-primary" [disabled]="!selectedFile || uploading()" (click)="uploadFile()">
                <span *ngIf="uploading()" class="spinner-border spinner-border-sm me-1"></span>
                {{ uploading() ? 'Uploading…' : 'Upload &amp; submit' }}
              </button>
            </div>

            <div *ngIf="showRevision" class="mt-3 p-3 surface">
              <label class="small fw-500">Revision reason</label>
              <textarea class="form-control form-control-sm mb-2" rows="2" [(ngModel)]="revisionReason" placeholder="Please change the CTA and increase logo visibility."></textarea>
              <button class="btn btn-sm btn-outline-danger" [disabled]="!revisionReason"
                      (click)="run(task.revision(id, revisionReason)); showRevision=false">Send revision request</button>
            </div>
          </div></div>

          <!-- Versions -->
          <div class="card mb-3"><div class="card-body">
            <div class="section-title mb-2">Versions</div>
            <div *ngFor="let v of detail.versions" class="d-flex justify-content-between align-items-center border-bottom py-2">
              <div>
                <span class="fw-500">Version {{ v.versionNumber }}</span>
                <span class="small text-muted-2 ms-2">{{ v.fileName }} · {{ v.createdAt | date:'MMM d' }}</span>
              </div>
              <div class="d-flex align-items-center gap-2">
                <app-status-badge [status]="v.status"></app-status-badge>
                <a class="btn btn-sm btn-outline-secondary" [href]="v.fileUrl" target="_blank"><i class="bi bi-download"></i></a>
              </div>
            </div>
            <div *ngIf="!detail.versions?.length" class="empty-state py-3"><i class="bi bi-file-earmark"></i><p class="mb-0 mt-1">No design uploaded yet.</p></div>
          </div></div>

          <!-- Comments -->
          <div class="card"><div class="card-body">
            <div class="section-title mb-2">Comments</div>
            <div *ngFor="let c of detail.comments" class="mb-2">
              <div class="small"><span class="fw-600">{{ c.user?.name }}</span> <span class="text-muted-2">· {{ c.createdAt | date:'MMM d, HH:mm' }}</span></div>
              <div>{{ c.message }}</div>
            </div>
            <div class="input-group input-group-sm mt-2">
              <input class="form-control" [(ngModel)]="comment" placeholder="Write a comment…" (keyup.enter)="postComment()" />
              <button class="btn btn-primary" (click)="postComment()">Send</button>
            </div>
          </div></div>
        </div>

        <!-- Right column: assignment + timeline -->
        <div class="col-lg-4">
          <div class="card mb-3"><div class="card-body">
            <div class="section-title mb-2">Assignment</div>
            <div class="d-flex align-items-center gap-2 mb-2">
              <div class="avatar">{{ initials(detail.task.assignee?.name) }}</div>
              <div><div class="fw-500">{{ detail.task.assignee?.name || 'Unassigned' }}</div>
                <div class="small text-muted-2">Campaign: {{ detail.task.campaign?.name || '—' }}</div></div>
            </div>
            <div class="small text-muted-2">Revisions: {{ detail.task.revisionCount }}</div>
          </div></div>

          <div class="card"><div class="card-body">
            <div class="section-title mb-3">Activity timeline</div>
            <ul class="timeline">
              <li *ngFor="let e of detail.timeline">
                <div class="t-time">{{ e.createdAt | date:'MMM d, HH:mm' }}</div>
                <div class="small">{{ e.description }}</div>
              </li>
            </ul>
          </div></div>
        </div>
      </div>
    </ng-container>
  `,
})
export class TaskDetailComponent implements OnInit {
  task = inject(TaskService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private socket = inject(SocketService);

  id = '';
  d = signal<any>(null);
  msg = signal(''); err = signal(false);

  showProgress = false; showSubmit = false; showRevision = false;
  progressVal = 50; submitRemarks = ''; revisionReason = ''; comment = '';
  selectedFile: File | null = null;
  uploading = signal(false);

  get isDesigner() { return this.auth.hasRole('DESIGNER'); }
  get inProgress() { return ['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUIRED'].includes(this.d()?.task?.status); }

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
    this.socket.on('task.progress_updated').subscribe((t: any) => { if (t?.id === this.id) this.load(); });
  }

  load() { this.task.detail(this.id).subscribe((d) => { this.d.set(d); this.progressVal = d.task.progress || 0; }); }
  can(status: string): boolean { return (this.d()?.allowedNext ?? []).includes(status); }

  run(obs: any) {
    obs.subscribe({
      next: () => { this.flash('Done.', false); this.load(); },
      error: (e: any) => this.flash(e?.error?.message ?? 'Action could not be completed.', true),
    });
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  uploadFile() {
    if (!this.selectedFile) return;
    this.uploading.set(true);
    this.task.upload(this.id, this.selectedFile, this.submitRemarks).subscribe({
      next: () => { this.uploading.set(false); this.showSubmit = false; this.selectedFile = null; this.submitRemarks = ''; this.flash('Design uploaded.', false); this.load(); },
      error: (e) => { this.uploading.set(false); this.flash(e?.error?.message ?? 'Upload failed. Please try again.', true); },
    });
  }

  postComment() {
    if (!this.comment.trim()) return;
    this.task.comment(this.id, this.comment).subscribe(() => { this.comment = ''; this.load(); });
  }

  flash(m: string, isErr: boolean) { this.msg.set(m); this.err.set(isErr); setTimeout(() => this.msg.set(''), 3000); }
  initials(n?: string) { return (n ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(); }
}
