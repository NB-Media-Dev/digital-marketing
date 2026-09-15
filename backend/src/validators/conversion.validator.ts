import { z } from 'zod';

export const createConversionSchema = z.object({
  leadId: z.string().min(1),
  amount: z.number().min(0),
  remarks: z.string().max(500).optional(),
});

export const updateConversionSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  amount: z.number().optional(),
});

export const createTransactionSchema = z.object({
  conversionId: z.string().min(1),
  amount: z.number().min(0),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
});

export const updateTransactionSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']),
});

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleCode: z.enum(['ADMIN', 'DM_MANAGER', 'DIGITAL_MARKETING', 'DESIGNER', 'TELECALLER', 'CONVERSION_MANAGER', 'SUPER_ADMIN']),
  mobile: z.string().optional(),
  teamId: z.string().optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(3).max(160),
  objective: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().min(0).optional(),
  leadTarget: z.number().min(0).optional(),
});

export const adSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(3).max(160),
  platform: z.enum(['META', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'WEBSITE', 'WHATSAPP', 'MANUAL', 'OTHER']).optional(),
  status: z.enum(['SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED']).optional(),
  externalRef: z.string().optional(),
  startDate: z.string().optional(),
  budget: z.number().min(0).optional(),
});
