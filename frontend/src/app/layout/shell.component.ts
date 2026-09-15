import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { SocketService } from '../core/socket.service';
import { NotificationService, SearchService, MetaService } from '../core/data.services';
import { NAV, NavItem, NavSection, SECTION_ORDER } from './nav.config';
import { Notification } from '../core/models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <div class="sidebar-backdrop d-lg-none" *ngIf="drawer()" (click)="drawer.set(false)"></div>

      <aside class="app-sidebar" [class.open]="drawer()" [class.collapsed]="collapsed()">
        <div class="brand">
          <span class="mark"><i class="bi bi-broadcast-pin text-white"></i></span>
          <span class="brand-text">MarkOps</span>
        </div>
        <nav class="mt-1 flex-grow-1 overflow-auto">
          <ng-container *ngFor="let group of grouped()">
            <div class="nav-section" *ngIf="!collapsed()">{{ group.section }}</div>
            <a *ngFor="let item of group.items" class="nav-link" [routerLink]="item.path"
               routerLinkActive="active" (click)="drawer.set(false)" [title]="item.label">
              <i class="bi" [ngClass]="'bi-' + item.icon"></i> <span class="nav-text">{{ item.label }}</span>
            </a>
          </ng-container>
        </nav>
        <button class="collapse-btn d-none d-lg-flex" (click)="collapsed.set(!collapsed())" [title]="collapsed() ? 'Expand' : 'Collapse'">
          <i class="bi" [ngClass]="collapsed() ? 'bi-chevron-double-right' : 'bi-chevron-double-left'"></i>
          <span class="nav-text">Collapse</span>
        </button>
      </aside>

      <div class="app-main">
        <header class="app-header">
          <button class="btn btn-sm btn-light d-lg-none" (click)="drawer.set(!drawer())"><i class="bi bi-list"></i></button>

          <!-- Global search -->
          <div class="global-search position-relative">
            <i class="bi bi-search"></i>
            <input class="form-control form-control-sm" placeholder="Search tasks, leads, campaigns…"
                   [value]="query()" (input)="onSearch($any($event.target).value)" (focus)="searchOpen.set(true)" />
            <div class="search-results surface" *ngIf="searchOpen() && query().length > 1">
              <ng-container *ngIf="hasResults(); else noRes">
                <ng-container *ngFor="let g of resultGroups()">
                  <div *ngIf="g.items.length" class="sr-group">
                    <div class="sr-head">{{ g.label }}</div>
                    <a *ngFor="let it of g.items" class="sr-item" (click)="goTo(g.key, it)">
                      <i class="bi" [ngClass]="'bi-' + g.icon"></i>
                      <span>{{ g.render(it) }}</span>
                    </a>
                  </div>
                </ng-container>
              </ng-container>
              <ng-template #noRes><div class="sr-empty">No matches for “{{ query() }}”.</div></ng-template>
            </div>
          </div>

          <div class="flex-grow-1"></div>

          <span class="small text-muted-2 d-none d-md-inline me-2" *ngIf="lastSync()">
            <i class="bi bi-cloud-check me-1"></i>Synced {{ lastSync() }}
          </span>

          <div class="dropdown">
            <button class="btn btn-sm position-relative" (click)="toggleNotif()">
              <i class="bi bi-bell fs-5"></i>
              <span *ngIf="unread() > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill" style="background:var(--danger)">{{ unread() }}</span>
            </button>
            <div class="surface p-2 position-absolute end-0 mt-2" style="width:340px;z-index:50" *ngIf="notifOpen()">
              <div class="d-flex justify-content-between align-items-center px-2 py-1">
                <strong>Notifications</strong>
                <a class="small cursor-pointer" (click)="markAll()">Mark all read</a>
              </div>
              <div style="max-height:360px;overflow:auto">
                <div *ngFor="let n of notifications()" class="p-2 border-top">
                  <div class="fw-500">{{ n.title }}</div>
                  <div class="small text-muted-2">{{ n.message }}</div>
                </div>
                <div *ngIf="notifications().length === 0" class="empty-state py-4"><i class="bi bi-bell-slash"></i><p class="mb-0 mt-1">You're all caught up.</p></div>
              </div>
            </div>
          </div>

          <div class="dropdown ms-1">
            <div class="d-flex align-items-center gap-2 cursor-pointer" (click)="menuOpen.set(!menuOpen())">
              <div class="avatar">{{ initials }}</div>
              <div class="d-none d-md-block">
                <div class="fw-600" style="line-height:1.1">{{ user()?.name }}</div>
                <div class="small text-muted-2">{{ user()?.roleName }}</div>
              </div>
            </div>
            <div class="surface p-1 position-absolute end-0 mt-2" style="width:180px;z-index:50" *ngIf="menuOpen()">
              <a class="nav-link text-dark px-3 py-2 d-block cursor-pointer" (click)="logout()"><i class="bi bi-box-arrow-right me-2"></i>Sign out</a>
            </div>
          </div>
        </header>

        <main class="app-content w-100" (click)="searchOpen.set(false)">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent implements OnInit {
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private notifService = inject(NotificationService);
  private searchService = inject(SearchService);
  private metaService = inject(MetaService);
  private router = inject(Router);

  user = this.auth.user;
  items: NavItem[] = [];
  drawer = signal(false);
  collapsed = signal(false);
  notifOpen = signal(false);
  menuOpen = signal(false);
  unread = signal(0);
  notifications = signal<Notification[]>([]);
  lastSync = signal<string>('');

  query = signal('');
  searchOpen = signal(false);
  results = signal<any>(null);
  private searchTimer: any;

  grouped = computed<{ section: NavSection; items: NavItem[] }[]>(() =>
    SECTION_ORDER.map((section) => ({ section, items: this.items.filter((i) => i.section === section) }))
      .filter((g) => g.items.length),
  );

  resultGroups() {
    const r = this.results() ?? {};
    return [
      { key: 'tasks', label: 'Tasks', icon: 'kanban', items: r.tasks ?? [], render: (x: any) => `${x.title} · ${x.taskCode}` },
      { key: 'leads', label: 'Leads', icon: 'person-lines-fill', items: r.leads ?? [], render: (x: any) => `${x.name} · ${x.mobile ?? x.leadCode}` },
      { key: 'campaigns', label: 'Campaigns', icon: 'megaphone', items: r.campaigns ?? [], render: (x: any) => x.name },
      { key: 'users', label: 'Users', icon: 'person', items: r.users ?? [], render: (x: any) => `${x.name} · ${x.email}` },
      { key: 'transactions', label: 'Transactions', icon: 'credit-card', items: r.transactions ?? [], render: (x: any) => `${x.transactionCode} · ₹${x.amount}` },
    ];
  }
  hasResults() { return this.resultGroups().some((g) => g.items.length); }

  get initials() {
    const n = this.user()?.name ?? '';
    return n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  ngOnInit() {
    const role = this.user()?.roleCode;
    this.items = role ? NAV[role] : [];
    this.socket.connect();
    this.loadNotifications();
    this.socket.on<Notification>('notification.created').subscribe((n) => {
      this.notifications.update((list) => [n, ...list].slice(0, 50));
      this.unread.update((c) => c + 1);
    });
    // Last-sync indicator (marketing-capable roles only).
    if (this.auth.has('ads.view')) {
      this.metaService.status().subscribe({
        next: (s) => this.lastSync.set(s?.lastSyncAt ? this.ago(s.lastSyncAt) : ''),
        error: () => {},
      });
      this.socket.on('ad.sync_completed').subscribe(() => this.lastSync.set('just now'));
    }
  }

  onSearch(value: string) {
    this.query.set(value);
    this.searchOpen.set(true);
    clearTimeout(this.searchTimer);
    if (value.trim().length < 2) { this.results.set(null); return; }
    this.searchTimer = setTimeout(() => {
      this.searchService.search(value).subscribe((r) => this.results.set(r));
    }, 250);
  }

  goTo(kind: string, item: any) {
    this.searchOpen.set(false);
    this.query.set('');
    const admin = !this.auth.hasRole('DESIGNER');
    if (kind === 'tasks') this.router.navigate([admin ? '/admin/tasks' : '/designer/tasks', item.id]);
    else if (kind === 'leads') this.router.navigate(['/admin/leads']);
    else if (kind === 'campaigns') this.router.navigate(['/admin/campaigns']);
    else if (kind === 'users') this.router.navigate(['/admin/users']);
    else if (kind === 'transactions') this.router.navigate(['/admin/transactions']);
  }

  loadNotifications() {
    this.notifService.list().subscribe((list) => {
      this.notifications.set(list);
      this.unread.set(list.filter((n) => !n.isRead).length);
    });
  }

  toggleNotif() { this.notifOpen.set(!this.notifOpen()); this.menuOpen.set(false); }
  markAll() { this.notifService.markAllRead().subscribe(() => this.unread.set(0)); }
  logout() { this.auth.logout(); }

  private ago(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    return hrs < 24 ? `${hrs} h ago` : `${Math.round(hrs / 24)} d ago`;
  }
}
