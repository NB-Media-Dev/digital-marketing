/* eslint-disable no-console */
import { PrismaClient, Prisma, TaskStatus, LeadStatus, Platform, CallOutcome, PaymentMethod, VersionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLE_NAMES, RoleCode } from '../common/rbac';
import { code } from '../utils/code';

const prisma = new PrismaClient();
const PASSWORD = 'Password123!';

const daysAgo = (n: number): Date => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const dateOnly = (d: Date): Date => new Date(d.toISOString().slice(0, 10));
const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length];

async function wipe(): Promise<void> {
  // FK-safe deletion order (children first).
  await prisma.transaction.deleteMany();
  await prisma.conversion.deleteMany();
  await prisma.followup.deleteMany();
  await prisma.callActivity.deleteMany();
  await prisma.leadStatusHistory.deleteMany();
  await prisma.leadAssignment.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.taskTimeline.deleteMany();
  await prisma.taskVersion.deleteMany();
  await prisma.taskProgressHistory.deleteMany();
  await prisma.taskStatusHistory.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.adMetric.deleteMany();
  await prisma.adSyncLog.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.dailyPerformance.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
}

async function main(): Promise<void> {
  console.log('Seeding…');
  await wipe();

  // Permissions & roles
  const permByCode = new Map<string, string>();
  for (const c of PERMISSIONS) {
    const p = await prisma.permission.create({ data: { code: c, description: c } });
    permByCode.set(c, p.id);
  }
  const roleByCode = new Map<RoleCode, string>();
  for (const rc of Object.values(RoleCode)) {
    const role = await prisma.role.create({ data: { code: rc, name: ROLE_NAMES[rc], isSystem: true } });
    roleByCode.set(rc, role.id);
    await prisma.rolePermission.createMany({
      data: ROLE_PERMISSIONS[rc].map((c) => ({ roleId: role.id, permissionId: permByCode.get(c)! })),
    });
  }

  // Teams
  const creative = await prisma.team.create({ data: { name: 'Creative' } });
  const growth = await prisma.team.create({ data: { name: 'Growth' } });

  // Users
  const hash = await bcrypt.hash(PASSWORD, 10);
  const mkUser = (name: string, email: string, rc: RoleCode, teamId?: string) =>
    prisma.user.create({
      data: {
        employeeCode: code('EMP'), name, email, mobile: '90000' + Math.floor(10000 + Math.random() * 89999),
        passwordHash: hash, roleId: roleByCode.get(rc)!, teamId, status: 'ACTIVE', isSeed: true,
      },
    });

  await mkUser('Admin', 'admin@markops.dev', RoleCode.ADMIN);
  const manager = await mkUser('Maya', 'manager@markops.dev', RoleCode.DM_MANAGER, growth.id);
  await mkUser('Rahul', 'marketing@markops.dev', RoleCode.DIGITAL_MARKETING, growth.id);
  const designers = [
    await mkUser('Arun', 'arun@markops.dev', RoleCode.DESIGNER, creative.id),
    await mkUser('Divya', 'divya@markops.dev', RoleCode.DESIGNER, creative.id),
    await mkUser('Karthik', 'karthik@markops.dev', RoleCode.DESIGNER, creative.id),
  ];
  const telecallers = [
    await mkUser('Priya', 'priya@markops.dev', RoleCode.TELECALLER, growth.id),
    await mkUser('Sneha', 'sneha@markops.dev', RoleCode.TELECALLER, growth.id),
    await mkUser('Vikram', 'vikram@markops.dev', RoleCode.TELECALLER, growth.id),
  ];
  const conversion = await mkUser('Nisha', 'conversion@markops.dev', RoleCode.CONVERSION_MANAGER, growth.id);

  // Campaigns
  const campaigns = await Promise.all([
    prisma.campaign.create({ data: { code: code('CMP'), name: 'September Admission Campaign', objective: 'Lead generation', status: 'ACTIVE', startDate: dateOnly(daysAgo(30)), budget: 300000, leadTarget: 5000, createdBy: manager.id, isSeed: true } }),
    prisma.campaign.create({ data: { code: code('CMP'), name: 'Festival Campaign', objective: 'Awareness + Leads', status: 'ACTIVE', startDate: dateOnly(daysAgo(20)), budget: 150000, leadTarget: 2500, createdBy: manager.id, isSeed: true } }),
    prisma.campaign.create({ data: { code: code('CMP'), name: 'Brand Awareness Campaign', objective: 'Reach', status: 'PAUSED', startDate: dateOnly(daysAgo(45)), budget: 120000, leadTarget: 1500, createdBy: manager.id, isSeed: true } }),
  ]);

  // Ads + 10 days of metrics
  const platforms: Platform[] = ['META', 'FACEBOOK', 'INSTAGRAM'];
  const ads = [];
  for (let i = 0; i < 6; i++) {
    const c = pick(campaigns, i);
    const ad = await prisma.ad.create({
      data: {
        code: code('AD'), campaignId: c.id, name: `${c.name} — Creative ${i + 1}`, platform: pick(platforms, i),
        externalRef: `mock_ad_${i + 1}`, status: i < 4 ? 'RUNNING' : i === 4 ? 'PAUSED' : 'SCHEDULED',
        startDate: dateOnly(daysAgo(15)), budget: 50000, createdBy: manager.id, isSeed: true,
      },
    });
    ads.push(ad);
    for (let d = 0; d < 10; d++) {
      const leads = 120 + Math.floor(Math.random() * 500);
      const clicks = leads + 200;
      const impressions = clicks * 30;
      await prisma.adMetric.create({
        data: {
          adId: ad.id, statDate: dateOnly(daysAgo(d)), spend: 3000 + Math.floor(Math.random() * 12000),
          impressions, reach: Math.round(impressions * 0.7), clicks, leads,
          conversions: Math.round(leads * 0.03), revenue: Math.round(leads * 0.03) * 2000,
        },
      });
    }
  }

  // Tasks with full history
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
  const taskSpecs: { title: string; status: TaskStatus; progress: number; overdue?: boolean }[] = [
    { title: 'Facebook admission poster', status: 'COMPLETED', progress: 100 },
    { title: 'Instagram story creative', status: 'IN_PROGRESS', progress: 50 },
    { title: 'Festival offer banner', status: 'SUBMITTED', progress: 100 },
    { title: 'Landing page hero image', status: 'REVISION_REQUIRED', progress: 75 },
    { title: 'WhatsApp broadcast creative', status: 'ASSIGNED', progress: 0, overdue: true },
    { title: 'Brand awareness reel cover', status: 'APPROVED', progress: 100 },
    { title: 'Google display banner set', status: 'ACCEPTED', progress: 10 },
    { title: 'Admission carousel (5 slides)', status: 'IN_PROGRESS', progress: 25, overdue: true },
  ];

  for (let i = 0; i < taskSpecs.length; i++) {
    const spec = taskSpecs[i];
    const designer = pick(designers, i);
    const c = pick(campaigns, i);
    const created = daysAgo(6 - (i % 5));
    const due = spec.overdue ? daysAgo(1) : daysAgo(-3);
    const isDone = ['APPROVED', 'COMPLETED'].includes(spec.status);
    const isSubmitted = ['SUBMITTED', 'APPROVED', 'COMPLETED'].includes(spec.status);

    const task = await prisma.task.create({
      data: {
        taskCode: code('TSK'), title: spec.title, description: `Creative for ${c.name}.`,
        requirements: 'Follow brand guidelines. Include logo and CTA.', campaignId: c.id, priority: pick(priorities, i),
        status: spec.status, progress: spec.progress, createdBy: manager.id, assignedBy: manager.id, assignedTo: designer.id,
        estimatedHours: 6, startDate: dateOnly(created), dueDate: dateOnly(due),
        acceptedAt: spec.status === 'ASSIGNED' ? null : daysAgo(5),
        startedAt: spec.progress > 0 ? daysAgo(5) : null,
        submittedAt: isSubmitted ? daysAgo(2) : null,
        approvedAt: isDone ? daysAgo(1) : null,
        completedAt: spec.status === 'COMPLETED' ? daysAgo(1) : null,
        revisionCount: spec.status === 'REVISION_REQUIRED' ? 1 : 0, isSeed: true,
      },
    });
    await prisma.taskAssignment.create({ data: { taskId: task.id, designerId: designer.id, assignedBy: manager.id, isCurrent: true } });
    await prisma.taskStatusHistory.create({ data: { taskId: task.id, oldStatus: null, newStatus: 'ASSIGNED', changedBy: manager.id } });
    await prisma.taskTimeline.createMany({
      data: [
        { taskId: task.id, eventType: 'created', description: 'Task created', actorId: manager.id },
        { taskId: task.id, eventType: 'assigned', description: `Task assigned to ${designer.name} by ${manager.name}`, actorId: manager.id },
      ],
    });
    if (spec.progress > 0) {
      await prisma.taskProgressHistory.create({ data: { taskId: task.id, oldProgress: 0, newProgress: spec.progress, updatedBy: designer.id, remarks: 'Progress update' } });
    }
    if (['SUBMITTED', 'REVISION_REQUIRED', 'APPROVED', 'COMPLETED'].includes(spec.status)) {
      const vStatus: VersionStatus = spec.status === 'REVISION_REQUIRED' ? 'REVISION_REQUIRED' : spec.status === 'SUBMITTED' ? 'SUBMITTED' : 'APPROVED';
      await prisma.taskVersion.create({
        data: { taskId: task.id, versionNumber: 1, fileName: 'v1.png', fileUrl: 'https://example.com/v1.png', fileType: 'image/png', fileSize: BigInt(240000), uploadedBy: designer.id, remarks: 'First version', status: vStatus },
      });
    }
  }

  // Leads + calls + follow-ups
  const statuses: LeadStatus[] = ['NEW', 'ASSIGNED', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP', 'QUALIFIED', 'CONVERTED', 'LOST'];
  const sources: Platform[] = ['META', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'WEBSITE', 'WHATSAPP'];
  const outcomeMap: Record<string, CallOutcome> = {
    CONTACTED: 'CONNECTED', INTERESTED: 'INTERESTED', NOT_INTERESTED: 'NOT_INTERESTED',
    FOLLOW_UP: 'CALL_BACK', QUALIFIED: 'QUALIFIED', CONVERTED: 'CONVERTED', LOST: 'LOST',
  };
  const convertedLeads = [];
  for (let i = 0; i < 120; i++) {
    const status = pick(statuses, i * 7 + (i % 3));
    const tc = pick(telecallers, i);
    const c = pick(campaigns, i);
    const ad = pick(ads, i);
    const assigned = status !== 'NEW';
    const lead = await prisma.lead.create({
      data: {
        leadCode: code('LD'), name: `Lead ${i + 1}`, mobile: '98' + (10000000 + i), email: `lead${i + 1}@example.com`,
        source: pick(sources, i), platform: 'Mobile', campaignId: c.id, adId: ad.id,
        assignedTo: assigned ? tc.id : null, status, isSeed: true, createdAt: daysAgo(i % 14),
      },
    });
    await prisma.leadStatusHistory.create({ data: { leadId: lead.id, oldStatus: null, newStatus: status, changedBy: assigned ? tc.id : manager.id } });
    if (assigned) {
      await prisma.leadAssignment.create({ data: { leadId: lead.id, telecallerId: tc.id, assignedBy: manager.id, isCurrent: true } });
      if (status !== 'ASSIGNED') {
        await prisma.callActivity.create({
          data: { leadId: lead.id, telecallerId: tc.id, callDate: daysAgo(i % 10), duration: 60 + (i % 5) * 45, outcome: outcomeMap[status] ?? 'CONNECTED', remarks: 'Seed call', isSeed: true },
        });
      }
      if (status === 'FOLLOW_UP') {
        await prisma.followup.create({ data: { leadId: lead.id, assignedTo: tc.id, followupDate: i % 2 ? daysAgo(1) : daysAgo(-1), status: 'PENDING', remarks: 'Call back requested', isSeed: true } });
      }
    }
    if (status === 'CONVERTED') convertedLeads.push(lead);
  }

  // Conversions + transactions
  const methods: PaymentMethod[] = ['UPI', 'CARD', 'BANK_TRANSFER'];
  for (let i = 0; i < convertedLeads.length; i++) {
    const lead = convertedLeads[i];
    const amount = new Prisma.Decimal(20000 + (i % 4) * 5000);
    const conv = await prisma.conversion.create({
      data: { conversionCode: code('CN'), leadId: lead.id, convertedBy: conversion.id, conversionDate: daysAgo(i % 5), amount, status: i % 3 === 0 ? 'PENDING' : 'CONFIRMED', isSeed: true },
    });
    const paid = i % 3 !== 0;
    await prisma.transaction.create({
      data: { transactionCode: code('TX'), conversionId: conv.id, leadId: lead.id, amount, paymentMethod: pick(methods, i), paymentStatus: paid ? 'PAID' : 'PENDING', paymentDate: paid ? daysAgo(i % 5) : null, isSeed: true },
    });
  }

  console.log('\n✔ Seed complete.');
  console.log(`  Users: 10 | Campaigns: 3 | Ads: 6 | Tasks: ${taskSpecs.length} | Leads: 120`);
  console.log(`  Login with any seeded email and password: ${PASSWORD}`);
  console.log('  e.g. admin@markops.dev / arun@markops.dev / priya@markops.dev\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
