/** Role & permission catalogue — the single source of truth for RBAC. */

export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  DM_MANAGER = 'DM_MANAGER',
  DIGITAL_MARKETING = 'DIGITAL_MARKETING',
  DESIGNER = 'DESIGNER',
  TELECALLER = 'TELECALLER',
  CONVERSION_MANAGER = 'CONVERSION_MANAGER',
}

export const PERMISSIONS = [
  'dashboard.view',
  'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.reassign', 'tasks.update',
  'tasks.submit', 'tasks.review', 'tasks.approve', 'tasks.revision', 'tasks.publish', 'tasks.complete',
  'designers.view', 'designer.performance.view',
  'campaigns.view', 'campaigns.create', 'campaigns.edit',
  'ads.view', 'ads.create', 'ads.update', 'ads.sync',
  'leads.view', 'leads.assign', 'leads.update', 'leads.export',
  'telecalling.view', 'telecalling.update',
  'conversions.view', 'conversions.update',
  'transactions.view', 'transactions.update',
  'reports.view', 'reports.export',
  'users.view', 'users.create', 'users.edit', 'users.disable',
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  [RoleCode.SUPER_ADMIN]: ALL,
  [RoleCode.ADMIN]: ALL,
  [RoleCode.DM_MANAGER]: [
    'dashboard.view',
    'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.reassign',
    'tasks.review', 'tasks.approve', 'tasks.revision', 'tasks.publish', 'tasks.complete',
    'designers.view', 'designer.performance.view',
    'campaigns.view', 'campaigns.create', 'campaigns.edit',
    'ads.view', 'ads.create', 'ads.update', 'ads.sync',
    'leads.view', 'leads.assign', 'leads.export',
    'reports.view', 'reports.export',
  ],
  [RoleCode.DIGITAL_MARKETING]: [
    'dashboard.view',
    'campaigns.view', 'campaigns.create', 'campaigns.edit',
    'ads.view', 'ads.create', 'ads.update', 'ads.sync',
    'leads.view', 'leads.export',
    'reports.view', 'reports.export',
  ],
  [RoleCode.DESIGNER]: [
    'dashboard.view', 'tasks.view', 'tasks.update', 'tasks.submit',
  ],
  [RoleCode.TELECALLER]: [
    'dashboard.view', 'leads.view', 'leads.update',
    'telecalling.view', 'telecalling.update', 'conversions.view',
  ],
  [RoleCode.CONVERSION_MANAGER]: [
    'dashboard.view', 'leads.view',
    'conversions.view', 'conversions.update',
    'transactions.view', 'transactions.update',
    'reports.view', 'reports.export',
  ],
};

export const ROLE_HOME: Record<RoleCode, string> = {
  [RoleCode.SUPER_ADMIN]: '/admin/dashboard',
  [RoleCode.ADMIN]: '/admin/dashboard',
  [RoleCode.DM_MANAGER]: '/manager/dashboard',
  [RoleCode.DIGITAL_MARKETING]: '/marketing/dashboard',
  [RoleCode.DESIGNER]: '/designer/dashboard',
  [RoleCode.TELECALLER]: '/telecaller/dashboard',
  [RoleCode.CONVERSION_MANAGER]: '/conversion/dashboard',
};

export const ROLE_NAMES: Record<RoleCode, string> = {
  [RoleCode.SUPER_ADMIN]: 'Super Admin',
  [RoleCode.ADMIN]: 'Admin',
  [RoleCode.DM_MANAGER]: 'DM Manager',
  [RoleCode.DIGITAL_MARKETING]: 'Digital Marketing',
  [RoleCode.DESIGNER]: 'Designer',
  [RoleCode.TELECALLER]: 'Telecaller',
  [RoleCode.CONVERSION_MANAGER]: 'Conversion Manager',
};
