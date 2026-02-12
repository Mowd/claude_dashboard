export * from '@/lib/workflow/types';
export * from '@/lib/websocket/protocol';

import type { AgentRole } from '@/lib/workflow/types';

export interface EventLogItem {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  role?: AgentRole;
  message: string;
}
