import { prisma } from '../database/prisma';
import { BadRequest, NotFound } from '../utils/response';
import { ActionContext } from '../types/context';
import { CreateUserInput, UpdateUserInput } from '../types/user.types';
import { code } from '../utils/code';
import { hashPassword } from '../utils/password';
import { auditService } from './audit.service';

function strip<T extends { passwordHash?: string }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _pw, ...rest } = user;
  void _pw;
  return rest;
}

export const userService = {
  async list(roleCode?: string) {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, ...(roleCode ? { role: { code: roleCode } } : {}) },
      include: { role: true, team: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => strip(u));
  },

  async create(input: CreateUserInput, ctx: ActionContext) {
    const role = await prisma.role.findUnique({ where: { code: input.roleCode } });
    if (!role) throw BadRequest('Invalid role.');
    const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (exists) throw BadRequest('A user with that email already exists.');

    const user = await prisma.user.create({
      data: {
        employeeCode: code('EMP'), name: input.name, email: input.email.toLowerCase(), mobile: input.mobile,
        passwordHash: await hashPassword(input.password), roleId: role.id, teamId: input.teamId, status: 'ACTIVE',
      },
      include: { role: true },
    });
    await auditService.record({ userId: ctx.user.id, action: 'USER_CREATED', entityType: 'user', entityId: user.id, newValue: { email: user.email, role: role.code }, ipAddress: ctx.ip });
    return strip(user);
  },

  async update(id: string, input: UpdateUserInput, ctx: ActionContext) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw NotFound('User not found.');
    let roleId: string | undefined;
    if (input.roleCode) {
      const role = await prisma.role.findUnique({ where: { code: input.roleCode } });
      if (role) roleId = role.id;
    }
    const user = await prisma.user.update({
      where: { id },
      data: { name: input.name, mobile: input.mobile, teamId: input.teamId, roleId },
      include: { role: true },
    });
    await auditService.record({ userId: ctx.user.id, action: 'USER_UPDATED', entityType: 'user', entityId: id, newValue: input, ipAddress: ctx.ip });
    return strip(user);
  },

  async setStatus(id: string, status: 'ACTIVE' | 'DISABLED', ctx: ActionContext) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw NotFound('User not found.');
    await prisma.user.update({ where: { id }, data: { status } });
    await auditService.record({ userId: ctx.user.id, action: status === 'DISABLED' ? 'USER_DISABLED' : 'USER_ENABLED', entityType: 'user', entityId: id, ipAddress: ctx.ip });
    return { ok: true };
  },
};
