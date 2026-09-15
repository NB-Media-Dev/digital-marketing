import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Task, Notification } from './models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private api = inject(ApiService);
  list(q?: Record<string, any>) { return this.api.getPaginated<Task>('/tasks', q); }
  detail(id: string) { return this.api.get<any>(`/tasks/${id}`); }
  create(body: any) { return this.api.post<Task>('/tasks', body); }
  update(id: string, body: any) { return this.api.patch<Task>(`/tasks/${id}`, body); }
  assign(id: string, designerId: string, reason?: string) { return this.api.post(`/tasks/${id}/assign`, { designerId, reason }); }
  reassign(id: string, designerId: string, reason?: string) { return this.api.post(`/tasks/${id}/reassign`, { designerId, reason }); }
  accept(id: string) { return this.api.post(`/tasks/${id}/accept`); }
  start(id: string) { return this.api.post(`/tasks/${id}/start`); }
  progress(id: string, progress: number, remarks?: string) { return this.api.post(`/tasks/${id}/progress`, { progress, remarks }); }
  submit(id: string, body: any) { return this.api.post(`/tasks/${id}/submit`, body); }
  upload(id: string, file: File, remarks?: string) {
    const form = new FormData();
    form.append('file', file);
    if (remarks) form.append('remarks', remarks);
    return this.api.upload(`/tasks/${id}/upload`, form);
  }
  review(id: string) { return this.api.post(`/tasks/${id}/review`, {}); }
  revision(id: string, reason: string) { return this.api.post(`/tasks/${id}/revision`, { reason }); }
  approve(id: string) { return this.api.post(`/tasks/${id}/approve`); }
  publish(id: string) { return this.api.post(`/tasks/${id}/publish`); }
  complete(id: string) { return this.api.post(`/tasks/${id}/complete`); }
  comment(id: string, message: string) { return this.api.post(`/tasks/${id}/comments`, { message }); }
}

@Injectable({ providedIn: 'root' })
export class DesignerService {
  private api = inject(ApiService);
  list() { return this.api.get<any[]>('/designers'); }
  workload() { return this.api.get<any[]>('/designers/workload'); }
  detail(id: string) { return this.api.get<any>(`/designers/${id}`); }
  performance(id: string) { return this.api.get<any>(`/designers/${id}/performance`); }
  tasks(id: string) { return this.api.get<any[]>(`/designers/${id}/tasks`); }
}

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private api = inject(ApiService);
  campaigns() { return this.api.get<any[]>('/campaigns'); }
  campaignPerformance() { return this.api.get<any[]>('/campaigns/performance'); }
  createCampaign(body: any) { return this.api.post('/campaigns', body); }
  updateCampaign(id: string, body: any) { return this.api.patch(`/campaigns/${id}`, body); }
  ads() { return this.api.get<any[]>('/ads'); }
  createAd(body: any) { return this.api.post('/ads', body); }
  updateAd(id: string, body: any) { return this.api.patch(`/ads/${id}`, body); }
  sync() { return this.api.post('/ads/sync'); }
  syncLogs() { return this.api.get<any[]>('/ads/sync-logs'); }
}

@Injectable({ providedIn: 'root' })
export class LeadService {
  private api = inject(ApiService);
  list(q?: Record<string, any>) { return this.api.getPaginated<any>('/leads', q); }
  detail(id: string) { return this.api.get<any>(`/leads/${id}`); }
  create(body: any) { return this.api.post('/leads', body); }
  assign(id: string, telecallerId: string) { return this.api.post(`/leads/${id}/assign`, { telecallerId }); }
  updateStatus(id: string, status: string, remarks?: string) { return this.api.patch(`/leads/${id}`, { status, remarks }); }
  funnel(campaignId?: string) { return this.api.get<any>('/leads/funnel', { campaignId }); }
  notInterested() { return this.api.get<any[]>('/leads/not-interested'); }
  sources() { return this.api.get<any[]>('/leads/source-performance'); }
}

@Injectable({ providedIn: 'root' })
export class TelecallingService {
  private api = inject(ApiService);
  dashboard() { return this.api.get<any>('/telecalling/dashboard'); }
  board() { return this.api.get<any[]>('/telecalling/board'); }
  logCall(body: any) { return this.api.post('/calls', body); }
  calls(leadId?: string) { return this.api.get<any[]>('/calls', { leadId }); }
  followups(bucket: string) { return this.api.get<any[]>('/followups', { bucket }); }
  createFollowup(body: any) { return this.api.post('/followups', body); }
  completeFollowup(id: string, remarks?: string) { return this.api.post(`/followups/${id}/complete`, { remarks }); }
}

@Injectable({ providedIn: 'root' })
export class ConversionService {
  private api = inject(ApiService);
  dashboard() { return this.api.get<any>('/conversions/dashboard'); }
  list() { return this.api.get<any[]>('/conversions'); }
  create(body: any) { return this.api.post('/conversions', body); }
  transactions() { return this.api.get<any[]>('/transactions'); }
  createTransaction(body: any) { return this.api.post('/transactions', body); }
  updateTransaction(id: string, paymentStatus: string) { return this.api.patch(`/transactions/${id}`, { paymentStatus }); }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = inject(ApiService);
  admin(range: string) { return this.api.get<any>('/dashboard/admin', { range }); }
  businessFunnel(range: string) { return this.api.get<any>('/dashboard/business-funnel', { range }); }
  needsAttention() { return this.api.get<any[]>('/dashboard/needs-attention'); }
  activity() { return this.api.get<any[]>('/dashboard/activity'); }
  pending() { return this.api.get<any>('/dashboard/pending'); }
  businessHealth() { return this.api.get<any[]>('/dashboard/business-health'); }
  today() { return this.api.get<any>('/dashboard/today'); }
}

@Injectable({ providedIn: 'root' })
export class MetaService {
  private api = inject(ApiService);
  status() { return this.api.get<any>('/meta/status'); }
  authUrl() { return this.api.get<{ url: string; state: string }>('/meta/auth-url'); }
  connectDemo() { return this.api.post<any>('/meta/connect-demo'); }
  test() { return this.api.post<any>('/meta/test'); }
  sync() { return this.api.post<any>('/meta/sync'); }
  disconnect() { return this.api.post<any>('/meta/disconnect'); }
  syncLogs() { return this.api.get<any[]>('/meta/sync-logs'); }
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private api = inject(ApiService);
  search(q: string) { return this.api.get<any>('/search', { q }); }
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private api = inject(ApiService);
  data(type: string) { return this.api.get<any[]>('/reports', { type }); }
  exportCsv(type: string) { return this.api.blob('/reports/export/csv', { type }); }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = inject(ApiService);
  list(role?: string) { return this.api.get<any[]>('/users', { role }); }
  create(body: any) { return this.api.post('/users', body); }
  update(id: string, body: any) { return this.api.patch(`/users/${id}`, body); }
  disable(id: string) { return this.api.post(`/users/${id}/disable`); }
  enable(id: string) { return this.api.post(`/users/${id}/enable`); }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);
  list() { return this.api.get<Notification[]>('/notifications'); }
  unreadCount() { return this.api.get<{ count: number }>('/notifications/unread-count'); }
  markRead(id: string) { return this.api.post(`/notifications/${id}/read`); }
  markAllRead() { return this.api.post('/notifications/read-all'); }
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private api = inject(ApiService);
  list(q?: Record<string, any>) { return this.api.getPaginated<any>('/audit', q); }
}
