import { RoleCode } from '../core/models';

export type NavSection = 'WORKSPACE' | 'OPERATIONS' | 'ANALYTICS' | 'MANAGEMENT' | 'SYSTEM';
export interface NavItem { label: string; icon: string; path: string; section: NavSection; }

export const SECTION_ORDER: NavSection[] = ['WORKSPACE', 'OPERATIONS', 'ANALYTICS', 'MANAGEMENT', 'SYSTEM'];

/** Role-based sidebar menus, grouped into sections. Paths are role-correct. */
export const NAV: Record<RoleCode, NavItem[]> = {
  SUPER_ADMIN: adminNav(),
  ADMIN: adminNav(),
  DM_MANAGER: [
    { label: 'Dashboard', icon: 'grid-1x2', path: '/manager/dashboard', section: 'WORKSPACE' },
    { label: 'Pending & Attention', icon: 'exclamation-diamond', path: '/admin/pending', section: 'WORKSPACE' },
    { label: 'Tasks', icon: 'kanban', path: '/admin/tasks', section: 'OPERATIONS' },
    { label: 'Designers', icon: 'people', path: '/admin/designers', section: 'OPERATIONS' },
    { label: 'Campaigns', icon: 'megaphone', path: '/admin/campaigns', section: 'OPERATIONS' },
    { label: 'Ads', icon: 'badge-ad', path: '/admin/ads', section: 'OPERATIONS' },
    { label: 'Leads', icon: 'person-lines-fill', path: '/admin/leads', section: 'OPERATIONS' },
    { label: 'Reports', icon: 'file-earmark-bar-graph', path: '/admin/reports', section: 'ANALYTICS' },
    { label: 'Settings', icon: 'gear', path: '/admin/settings', section: 'SYSTEM' },
  ],
  DIGITAL_MARKETING: [
    { label: 'Dashboard', icon: 'grid-1x2', path: '/marketing/dashboard', section: 'WORKSPACE' },
    { label: 'Campaigns', icon: 'megaphone', path: '/marketing/campaigns', section: 'OPERATIONS' },
    { label: 'Ads', icon: 'badge-ad', path: '/marketing/ads', section: 'OPERATIONS' },
    { label: 'Leads', icon: 'person-lines-fill', path: '/marketing/leads', section: 'OPERATIONS' },
    { label: 'Reports', icon: 'file-earmark-bar-graph', path: '/admin/reports', section: 'ANALYTICS' },
    { label: 'Settings', icon: 'gear', path: '/admin/settings', section: 'SYSTEM' },
  ],
  DESIGNER: [
    { label: 'Dashboard', icon: 'grid-1x2', path: '/designer/dashboard', section: 'WORKSPACE' },
    { label: 'My Tasks', icon: 'kanban', path: '/designer/tasks', section: 'OPERATIONS' },
    { label: 'Pending Review', icon: 'hourglass-split', path: '/designer/pending-review', section: 'OPERATIONS' },
    { label: 'Completed', icon: 'check2-circle', path: '/designer/completed', section: 'OPERATIONS' },
  ],
  TELECALLER: [
    { label: 'Dashboard', icon: 'grid-1x2', path: '/telecaller/dashboard', section: 'WORKSPACE' },
    { label: 'My Leads', icon: 'person-lines-fill', path: '/telecaller/leads', section: 'OPERATIONS' },
    { label: 'Follow-ups', icon: 'telephone-forward', path: '/telecaller/followups', section: 'OPERATIONS' },
    { label: 'Call History', icon: 'clock-history', path: '/telecaller/calls', section: 'OPERATIONS' },
  ],
  CONVERSION_MANAGER: [
    { label: 'Dashboard', icon: 'grid-1x2', path: '/conversion/dashboard', section: 'WORKSPACE' },
    { label: 'Qualified Leads', icon: 'person-check', path: '/conversion/leads', section: 'OPERATIONS' },
    { label: 'Conversions', icon: 'graph-up-arrow', path: '/conversion/conversions', section: 'OPERATIONS' },
    { label: 'Transactions', icon: 'credit-card', path: '/conversion/transactions', section: 'OPERATIONS' },
    { label: 'Reports', icon: 'file-earmark-bar-graph', path: '/admin/reports', section: 'ANALYTICS' },
  ],
};

function adminNav(): NavItem[] {
  return [
    { label: 'Dashboard', icon: 'grid-1x2', path: '/admin/dashboard', section: 'WORKSPACE' },
    { label: 'Pending & Attention', icon: 'exclamation-diamond', path: '/admin/pending', section: 'WORKSPACE' },
    { label: 'Tasks', icon: 'kanban', path: '/admin/tasks', section: 'OPERATIONS' },
    { label: 'Designers', icon: 'people', path: '/admin/designers', section: 'OPERATIONS' },
    { label: 'Campaigns', icon: 'megaphone', path: '/admin/campaigns', section: 'OPERATIONS' },
    { label: 'Ads', icon: 'badge-ad', path: '/admin/ads', section: 'OPERATIONS' },
    { label: 'Leads', icon: 'person-lines-fill', path: '/admin/leads', section: 'OPERATIONS' },
    { label: 'Telecalling', icon: 'headset', path: '/admin/telecalling', section: 'OPERATIONS' },
    { label: 'Conversions', icon: 'graph-up-arrow', path: '/admin/conversions', section: 'OPERATIONS' },
    { label: 'Transactions', icon: 'credit-card', path: '/admin/transactions', section: 'OPERATIONS' },
    { label: 'Reports', icon: 'file-earmark-bar-graph', path: '/admin/reports', section: 'ANALYTICS' },
    { label: 'Users & Roles', icon: 'person-gear', path: '/admin/users', section: 'MANAGEMENT' },
    { label: 'Audit Logs', icon: 'shield-check', path: '/admin/audit', section: 'MANAGEMENT' },
    { label: 'Settings', icon: 'gear', path: '/admin/settings', section: 'SYSTEM' },
  ];
}
