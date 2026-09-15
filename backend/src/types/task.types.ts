import { Priority, TaskStatus } from '@prisma/client';

export interface CreateTaskInput {
  title: string;
  description?: string;
  requirements?: string;
  campaignId?: string;
  priority?: Priority;
  designerId?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
}

export interface TaskListFilters {
  status?: TaskStatus;
  priority?: Priority;
  designerId?: string;
  campaignId?: string;
  bucket?: 'active' | 'pending_review' | 'overdue' | 'completed';
}
