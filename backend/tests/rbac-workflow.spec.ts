import { canTransition, allowedNextStatuses, TaskStatus } from '../src/common/task-workflow';
import { ROLE_PERMISSIONS, RoleCode } from '../src/common/rbac';

describe('task workflow state machine', () => {
  it('lets a designer accept an assigned task', () => {
    expect(canTransition(TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, RoleCode.DESIGNER)).toBe(true);
  });

  it('forbids a designer approving (only managers may)', () => {
    expect(canTransition(TaskStatus.UNDER_REVIEW, TaskStatus.APPROVED, RoleCode.DESIGNER)).toBe(false);
    expect(canTransition(TaskStatus.UNDER_REVIEW, TaskStatus.APPROVED, RoleCode.DM_MANAGER)).toBe(true);
  });

  it('rejects arbitrary jumps (assigned → approved)', () => {
    expect(canTransition(TaskStatus.ASSIGNED, TaskStatus.APPROVED, RoleCode.ADMIN)).toBe(false);
  });

  it('offers a manager both revision and approval from review', () => {
    const next = allowedNextStatuses(TaskStatus.UNDER_REVIEW, RoleCode.DM_MANAGER);
    expect(next).toContain(TaskStatus.REVISION_REQUIRED);
    expect(next).toContain(TaskStatus.APPROVED);
  });

  it('only allows a designer to submit from in-progress', () => {
    expect(allowedNextStatuses(TaskStatus.IN_PROGRESS, RoleCode.DESIGNER)).toEqual([TaskStatus.SUBMITTED]);
  });
});

describe('RBAC catalogue', () => {
  it('grants a designer submit but never approve', () => {
    const p = ROLE_PERMISSIONS[RoleCode.DESIGNER];
    expect(p).toContain('tasks.submit');
    expect(p).not.toContain('tasks.approve');
  });

  it('grants a telecaller telecalling but not campaign editing', () => {
    const p = ROLE_PERMISSIONS[RoleCode.TELECALLER];
    expect(p).toContain('telecalling.update');
    expect(p).not.toContain('campaigns.edit');
  });

  it('gives admin every permission', () => {
    expect(ROLE_PERMISSIONS[RoleCode.ADMIN]).toContain('audit.view');
    expect(ROLE_PERMISSIONS[RoleCode.ADMIN]).toContain('users.disable');
  });
});
