/** Canonical Socket.IO event names (server → client). */
export const EVENTS = {
  task: {
    created: 'task.created',
    assigned: 'task.assigned',
    reassigned: 'task.reassigned',
    progressUpdated: 'task.progress_updated',
    submitted: 'task.submitted',
    revisionRequested: 'task.revision_requested',
    approved: 'task.approved',
    published: 'task.published',
    completed: 'task.completed',
    review: 'task.review',
    started: 'task.started',
    accepted: 'task.accepted',
    comment: 'task.comment',
  },
  lead: {
    created: 'lead.created',
    assigned: 'lead.assigned',
    statusChanged: 'lead.status_changed',
  },
  call: { created: 'call.created' },
  followup: { created: 'followup.created' },
  conversion: { created: 'conversion.created' },
  transaction: { created: 'transaction.created' },
  ad: { syncCompleted: 'ad.sync_completed' },
  notification: { created: 'notification.created' },
} as const;
