import { TaskStatus } from '@prisma/client';
import { RoleCode } from './rbac';

export { TaskStatus };

interface Transition {
  from: TaskStatus;
  to: TaskStatus;
  roles: RoleCode[];
}

const MANAGERS = [RoleCode.DM_MANAGER, RoleCode.ADMIN, RoleCode.SUPER_ADMIN];
const DESIGNER = [RoleCode.DESIGNER];

/** Allowed transitions and the roles permitted to perform each. */
export const TASK_TRANSITIONS: Transition[] = [
  { from: TaskStatus.DRAFT, to: TaskStatus.ASSIGNED, roles: MANAGERS },
  { from: TaskStatus.ASSIGNED, to: TaskStatus.ACCEPTED, roles: DESIGNER },
  { from: TaskStatus.ACCEPTED, to: TaskStatus.IN_PROGRESS, roles: DESIGNER },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.SUBMITTED, roles: DESIGNER },
  { from: TaskStatus.REVISION_REQUIRED, to: TaskStatus.RESUBMITTED, roles: DESIGNER },
  { from: TaskStatus.SUBMITTED, to: TaskStatus.UNDER_REVIEW, roles: MANAGERS },
  { from: TaskStatus.RESUBMITTED, to: TaskStatus.UNDER_REVIEW, roles: MANAGERS },
  { from: TaskStatus.UNDER_REVIEW, to: TaskStatus.REVISION_REQUIRED, roles: MANAGERS },
  { from: TaskStatus.UNDER_REVIEW, to: TaskStatus.APPROVED, roles: MANAGERS },
  { from: TaskStatus.APPROVED, to: TaskStatus.PUBLISHED, roles: MANAGERS },
  { from: TaskStatus.PUBLISHED, to: TaskStatus.COMPLETED, roles: MANAGERS },
];

const PRIVILEGED = new Set<RoleCode>([RoleCode.SUPER_ADMIN, RoleCode.ADMIN]);

export function canTransition(from: TaskStatus, to: TaskStatus, role: RoleCode): boolean {
  const t = TASK_TRANSITIONS.find((x) => x.from === from && x.to === to);
  if (!t) return false;
  if (PRIVILEGED.has(role)) return true;
  return t.roles.includes(role);
}

export function allowedNextStatuses(from: TaskStatus, role: RoleCode): TaskStatus[] {
  return TASK_TRANSITIONS
    .filter((t) => t.from === from && (PRIVILEGED.has(role) || t.roles.includes(role)))
    .map((t) => t.to);
}

export const ACTIVE_STATUSES: TaskStatus[] = [
  TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS, TaskStatus.REVISION_REQUIRED,
];
export const REVIEW_STATUSES: TaskStatus[] = [
  TaskStatus.SUBMITTED, TaskStatus.RESUBMITTED, TaskStatus.UNDER_REVIEW,
];
export const DONE_STATUSES: TaskStatus[] = [
  TaskStatus.APPROVED, TaskStatus.PUBLISHED, TaskStatus.COMPLETED,
];
