// Audit Log — Contrl SPC
// localStorage-based, Supabase migration ready

export type AuditAction =
  | 'chart.created'
  | 'chart.updated'
  | 'chart.deleted'
  | 'chart.data_appended'
  | 'chart.split_added'
  | 'chart.annotation_added'
  | 'user.login'
  | 'user.logout'
  | 'workspace.created'
  | 'workspace.updated'
  | 'workspace.deleted'
  | 'member.invited'
  | 'member.removed'
  | 'member.role_changed'
  | 'settings.updated'
  | 'api_key.generated'
  | 'api_key.revoked';

export interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  target: string;       // e.g. chart id, workspace name
  targetLabel: string;   // human-readable target name
  details: string;       // additional context
  timestamp: string;
}

const AUDIT_KEY = 'contrl_audit_log';
const MAX_ENTRIES = 5000;

// ─── Read / Write ────────────────────────────────────────────────────────────

export function getAuditLog(): AuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAuditLog(entries: AuditEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUDIT_KEY, JSON.stringify(entries));
}

export function logAuditEvent(
  event: Omit<AuditEntry, 'id' | 'timestamp'>
): AuditEntry {
  const entries = getAuditLog();
  const entry: AuditEntry = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  saveAuditLog(entries);
  return entry;
}

export function clearAuditLog(): void {
  saveAuditLog([]);
}

// ─── Filtering ───────────────────────────────────────────────────────────────

export interface AuditFilter {
  action?: AuditAction;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function filterAuditLog(filter: AuditFilter): AuditEntry[] {
  let entries = getAuditLog();

  if (filter.action) {
    entries = entries.filter((e) => e.action === filter.action);
  }
  if (filter.userId) {
    entries = entries.filter((e) => e.userId === filter.userId);
  }
  if (filter.dateFrom) {
    entries = entries.filter((e) => e.timestamp >= filter.dateFrom!);
  }
  if (filter.dateTo) {
    const endDate = new Date(filter.dateTo);
    endDate.setDate(endDate.getDate() + 1);
    entries = entries.filter((e) => e.timestamp < endDate.toISOString());
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.targetLabel.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        e.userEmail.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
    );
  }

  return entries;
}

// ─── Action Labels ───────────────────────────────────────────────────────────

export const ACTION_LABELS: Record<AuditAction, string> = {
  'chart.created': 'Chart Created',
  'chart.updated': 'Chart Updated',
  'chart.deleted': 'Chart Deleted',
  'chart.data_appended': 'Data Appended',
  'chart.split_added': 'Split Added',
  'chart.annotation_added': 'Annotation Added',
  'user.login': 'User Login',
  'user.logout': 'User Logout',
  'workspace.created': 'Workspace Created',
  'workspace.updated': 'Workspace Updated',
  'workspace.deleted': 'Workspace Deleted',
  'member.invited': 'Member Invited',
  'member.removed': 'Member Removed',
  'member.role_changed': 'Role Changed',
  'settings.updated': 'Settings Updated',
  'api_key.generated': 'API Key Generated',
  'api_key.revoked': 'API Key Revoked',
};

export const ACTION_COLORS: Record<string, string> = {
  'chart.created': 'text-green-400',
  'chart.updated': 'text-blue-400',
  'chart.deleted': 'text-red-400',
  'chart.data_appended': 'text-cyan-400',
  'chart.split_added': 'text-purple-400',
  'chart.annotation_added': 'text-indigo-400',
  'user.login': 'text-emerald-400',
  'user.logout': 'text-gray-400',
  'workspace.created': 'text-green-400',
  'workspace.updated': 'text-blue-400',
  'workspace.deleted': 'text-red-400',
  'member.invited': 'text-amber-400',
  'member.removed': 'text-red-400',
  'member.role_changed': 'text-purple-400',
  'settings.updated': 'text-gray-400',
  'api_key.generated': 'text-amber-400',
  'api_key.revoked': 'text-red-400',
};
