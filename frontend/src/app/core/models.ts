export type RoleCode =
  | 'SUPER_ADMIN' | 'ADMIN' | 'DM_MANAGER' | 'DIGITAL_MARKETING'
  | 'DESIGNER' | 'TELECALLER' | 'CONVERSION_MANAGER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  profileImage?: string;
  roleCode: RoleCode;
  roleName: string;
  permissions: string[];
  home: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export type TaskStatus =
  | 'DRAFT' | 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'SUBMITTED'
  | 'UNDER_REVIEW' | 'REVISION_REQUIRED' | 'RESUBMITTED' | 'APPROVED'
  | 'PUBLISHED' | 'COMPLETED';

export interface Task {
  id: string;
  taskCode: string;
  title: string;
  description?: string;
  requirements?: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  progress: number;
  assignedTo?: string;
  assignee?: { id: string; name: string };
  campaign?: { id: string; name: string };
  dueDate?: string;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}
