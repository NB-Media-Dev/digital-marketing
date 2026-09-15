import { z } from 'zod';

const priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  requirements: z.string().optional(),
  campaignId: z.string().optional(),
  priority: priority.optional(),
  designerId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  priority: priority.optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
});

export const assignTaskSchema = z.object({
  designerId: z.string().min(1),
  reason: z.string().optional(),
});

export const progressSchema = z.object({
  progress: z.number().int().min(0).max(100),
  remarks: z.string().max(255).optional(),
});

export const submitSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  remarks: z.string().max(500).optional(),
});

export const revisionSchema = z.object({
  reason: z.string().min(3).max(500),
  attachmentUrl: z.string().optional(),
});

export const commentSchema = z.object({
  message: z.string().min(1),
  attachmentUrl: z.string().optional(),
});
