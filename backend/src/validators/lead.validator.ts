import { z } from 'zod';

const source = z.enum(['META', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'WEBSITE', 'WHATSAPP', 'MANUAL', 'OTHER']);
const leadStatus = z.enum([
  'NEW', 'ASSIGNED', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP', 'QUALIFIED', 'CONVERTED', 'LOST',
]);

export const createLeadSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().optional(),
  email: z.string().optional(),
  source: source.optional(),
  platform: z.string().optional(),
  campaignId: z.string().optional(),
  adId: z.string().optional(),
});

export const assignLeadSchema = z.object({ telecallerId: z.string().min(1) });

export const leadStatusSchema = z.object({
  status: leadStatus,
  remarks: z.string().max(500).optional(),
});

const outcome = z.enum([
  'CONNECTED', 'NOT_CONNECTED', 'INTERESTED', 'NOT_INTERESTED', 'CALL_BACK', 'QUALIFIED', 'CONVERTED', 'LOST',
]);

export const logCallSchema = z.object({
  leadId: z.string().min(1),
  outcome,
  duration: z.number().int().min(0).optional(),
  remarks: z.string().max(500).optional(),
  nextFollowup: z.string().optional(),
});

export const createFollowupSchema = z.object({
  leadId: z.string().min(1),
  followupDate: z.string().min(1),
  remarks: z.string().max(500).optional(),
});
