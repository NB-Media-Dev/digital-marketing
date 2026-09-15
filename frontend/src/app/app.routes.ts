import { Routes } from '@angular/router';
import { authGuard } from './core/guards';

/**
 * All authenticated routes are children of the ShellComponent.
 * Dashboards are role-specific; the operational pages (tasks, leads, etc.)
 * are shared single-source-of-truth views reached from role menus.
 */
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login.component').then((m) => m.LoginComponent) },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'admin/dashboard' },

      // Dashboards
      { path: 'admin/dashboard', loadComponent: () => import('./features/dashboards/admin-dashboard.component').then((m) => m.AdminDashboardComponent) },
      { path: 'manager/dashboard', loadComponent: () => import('./features/dashboards/admin-dashboard.component').then((m) => m.AdminDashboardComponent) },
      { path: 'marketing/dashboard', loadComponent: () => import('./features/dashboards/marketing-dashboard.component').then((m) => m.MarketingDashboardComponent) },
      { path: 'designer/dashboard', loadComponent: () => import('./features/dashboards/designer-dashboard.component').then((m) => m.DesignerDashboardComponent) },
      { path: 'telecaller/dashboard', loadComponent: () => import('./features/dashboards/telecaller-dashboard.component').then((m) => m.TelecallerDashboardComponent) },
      { path: 'conversion/dashboard', loadComponent: () => import('./features/dashboards/conversion-dashboard.component').then((m) => m.ConversionDashboardComponent) },

      // Tasks (single source of truth)
      { path: 'admin/tasks', loadComponent: () => import('./features/tasks/task-list.component').then((m) => m.TaskListComponent) },
      { path: 'admin/tasks/:id', loadComponent: () => import('./features/tasks/task-detail.component').then((m) => m.TaskDetailComponent) },
      { path: 'designer/tasks', loadComponent: () => import('./features/tasks/task-list.component').then((m) => m.TaskListComponent) },
      { path: 'designer/tasks/:id', loadComponent: () => import('./features/tasks/task-detail.component').then((m) => m.TaskDetailComponent) },
      { path: 'designer/pending-review', data: { bucket: 'pending_review' }, loadComponent: () => import('./features/tasks/task-list.component').then((m) => m.TaskListComponent) },
      { path: 'designer/completed', data: { bucket: 'completed' }, loadComponent: () => import('./features/tasks/task-list.component').then((m) => m.TaskListComponent) },

      // Designers
      { path: 'admin/designers', loadComponent: () => import('./features/designers/designer-list.component').then((m) => m.DesignerListComponent) },
      { path: 'admin/designers/:id', loadComponent: () => import('./features/designers/designer-detail.component').then((m) => m.DesignerDetailComponent) },

      // Marketing
      { path: 'admin/campaigns', loadComponent: () => import('./features/marketing/campaigns.component').then((m) => m.CampaignsComponent) },
      { path: 'marketing/campaigns', loadComponent: () => import('./features/marketing/campaigns.component').then((m) => m.CampaignsComponent) },
      { path: 'admin/ads', loadComponent: () => import('./features/marketing/ads.component').then((m) => m.AdsComponent) },
      { path: 'marketing/ads', loadComponent: () => import('./features/marketing/ads.component').then((m) => m.AdsComponent) },

      // Leads (shared)
      { path: 'admin/leads', loadComponent: () => import('./features/leads/leads.component').then((m) => m.LeadsComponent) },
      { path: 'marketing/leads', loadComponent: () => import('./features/leads/leads.component').then((m) => m.LeadsComponent) },
      { path: 'telecaller/leads', loadComponent: () => import('./features/leads/leads.component').then((m) => m.LeadsComponent) },
      { path: 'conversion/leads', data: { qualified: true }, loadComponent: () => import('./features/leads/leads.component').then((m) => m.LeadsComponent) },

      // Telecalling
      { path: 'admin/telecalling', loadComponent: () => import('./features/telecalling/telecaller-board.component').then((m) => m.TelecallerBoardComponent) },
      { path: 'telecaller/followups', loadComponent: () => import('./features/telecalling/followups.component').then((m) => m.FollowupsComponent) },
      { path: 'telecaller/calls', loadComponent: () => import('./features/telecalling/calls.component').then((m) => m.CallsComponent) },

      // Conversions & transactions
      { path: 'admin/conversions', loadComponent: () => import('./features/conversions/conversions.component').then((m) => m.ConversionsComponent) },
      { path: 'conversion/conversions', loadComponent: () => import('./features/conversions/conversions.component').then((m) => m.ConversionsComponent) },
      { path: 'admin/transactions', loadComponent: () => import('./features/conversions/transactions.component').then((m) => m.TransactionsComponent) },
      { path: 'conversion/transactions', loadComponent: () => import('./features/conversions/transactions.component').then((m) => m.TransactionsComponent) },

      // Control center
      { path: 'admin/pending', loadComponent: () => import('./features/dashboards/pending.component').then((m) => m.PendingComponent) },

      // Reports / users / audit / settings
      { path: 'admin/reports', loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent) },
      { path: 'admin/settings', loadComponent: () => import('./features/admin/settings.component').then((m) => m.SettingsComponent) },
      { path: 'admin/users', loadComponent: () => import('./features/admin/users.component').then((m) => m.UsersComponent) },
      { path: 'admin/audit', loadComponent: () => import('./features/admin/audit.component').then((m) => m.AuditComponent) },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
