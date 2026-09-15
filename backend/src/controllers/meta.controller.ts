import { Request, Response } from 'express';
import { metaService } from '../services/meta.service';
import { adService } from '../services/ad.service';
import { socketService } from '../services/socket.service';
import { EVENTS } from '../socket/events';
import { auditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';
import { uuid } from '../utils/uuid';

export const metaController = {
  async status(_req: Request, res: Response) {
    sendSuccess(res, await metaService.status());
  },

  /** Returns the OAuth dialog URL (real mode) for the frontend to open. */
  async authUrl(_req: Request, res: Response) {
    const state = uuid();
    sendSuccess(res, { url: metaService.authUrl(state), state });
  },

  /** OAuth redirect target — exchanges the code then redirects back to the app. */
  async callback(req: Request, res: Response) {
    const code = String(req.query.code ?? '');
    await metaService.handleCallback(code);
    res.redirect(`${env.clientUrl}/admin/settings?meta=connected`);
  },

  async connectDemo(req: Request, res: Response) {
    const conn = await metaService.connectDemo(req.user!.id);
    await auditService.record({ userId: req.user!.id, action: 'META_CONNECTED', entityType: 'meta_connection', entityId: conn.id, newValue: { mode: 'demo' }, ipAddress: req.ip });
    sendSuccess(res, conn, 'Meta connected in demo mode.');
  },

  async test(_req: Request, res: Response) {
    sendSuccess(res, await metaService.test());
  },

  async sync(req: Request, res: Response) {
    const log = await adService.sync('MANUAL', req.user!.id);
    sendSuccess(res, log, log.message ?? 'Sync complete.');
  },

  async disconnect(req: Request, res: Response) {
    const conn = await metaService.disconnect();
    await auditService.record({ userId: req.user!.id, action: 'META_DISCONNECTED', entityType: 'meta_connection', entityId: conn.id, ipAddress: req.ip });
    sendSuccess(res, conn, 'Meta disconnected.');
  },

  syncLogs(_req: Request, res: Response) {
    return adService.syncLogs().then((logs) => sendSuccess(res, logs));
  },

  // ── Webhook (public) ─────────────────────────────────
  verifyWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === env.meta.webhookVerifyToken) {
      res.status(200).send(String(challenge ?? ''));
    } else {
      res.sendStatus(403);
    }
  },

  async receiveWebhook(req: Request, res: Response) {
    // Acknowledge fast; process best-effort.
    res.sendStatus(200);
    try {
      const body = req.body as { entry?: Array<{ changes?: Array<{ value?: Record<string, unknown> }> }>; name?: string; mobile?: string };
      // Normalized test payload
      if (body?.name || body?.mobile) {
        const lead = await metaService.ingestLead(body as never);
        socketService.broadcast(EVENTS.lead.created, { id: lead.id, leadCode: lead.leadCode });
        return;
      }
      // Meta leadgen shape
      for (const entry of body?.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const v = change.value ?? {};
          const lead = await metaService.ingestLead({
            leadgenId: String(v['leadgen_id'] ?? ''),
            adId: (v['ad_id'] as string) ?? undefined,
          });
          socketService.broadcast(EVENTS.lead.created, { id: lead.id, leadCode: lead.leadCode });
        }
      }
    } catch {
      /* logged upstream; never fail the webhook ack */
    }
  },
};
