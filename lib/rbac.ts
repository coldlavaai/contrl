// Role-Based Access Control — Contrl SPC

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Permission {
  canManageWorkspace: boolean;   // delete workspace, billing
  canManageMembers: boolean;     // invite, remove, change roles
  canEditAllCharts: boolean;     // edit any chart
  canCreateCharts: boolean;      // create new charts
  canEditOwnCharts: boolean;     // edit charts they created
  canViewCharts: boolean;        // view charts
  canDeleteCharts: boolean;      // delete charts
  canViewAuditLog: boolean;      // view audit trail
  canManageApiKeys: boolean;     // generate/revoke API keys
  canConfigureAlerts: boolean;   // set up alert rules
}

const ROLE_PERMISSIONS: Record<Role, Permission> = {
  owner: {
    canManageWorkspace: true,
    canManageMembers: true,
    canEditAllCharts: true,
    canCreateCharts: true,
    canEditOwnCharts: true,
    canViewCharts: true,
    canDeleteCharts: true,
    canViewAuditLog: true,
    canManageApiKeys: true,
    canConfigureAlerts: true,
  },
  admin: {
    canManageWorkspace: false,
    canManageMembers: true,
    canEditAllCharts: true,
    canCreateCharts: true,
    canEditOwnCharts: true,
    canViewCharts: true,
    canDeleteCharts: true,
    canViewAuditLog: true,
    canManageApiKeys: true,
    canConfigureAlerts: true,
  },
  editor: {
    canManageWorkspace: false,
    canManageMembers: false,
    canEditAllCharts: false,
    canCreateCharts: true,
    canEditOwnCharts: true,
    canViewCharts: true,
    canDeleteCharts: false,
    canViewAuditLog: false,
    canManageApiKeys: false,
    canConfigureAlerts: false,
  },
  viewer: {
    canManageWorkspace: false,
    canManageMembers: false,
    canEditAllCharts: false,
    canCreateCharts: false,
    canEditOwnCharts: false,
    canViewCharts: true,
    canDeleteCharts: false,
    canViewAuditLog: false,
    canManageApiKeys: false,
    canConfigureAlerts: false,
  },
};

export function getPermissions(role: Role): Permission {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: Role, key: keyof Permission): boolean {
  return ROLE_PERMISSIONS[role][key];
}

export function canUserPerformAction(
  role: Role,
  action: 'create' | 'edit' | 'delete' | 'view' | 'manage-members' | 'manage-workspace'
): boolean {
  const perms = getPermissions(role);
  switch (action) {
    case 'create': return perms.canCreateCharts;
    case 'edit': return perms.canEditAllCharts || perms.canEditOwnCharts;
    case 'delete': return perms.canDeleteCharts;
    case 'view': return perms.canViewCharts;
    case 'manage-members': return perms.canManageMembers;
    case 'manage-workspace': return perms.canManageWorkspace;
    default: return false;
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: 'Full access — can delete workspace and manage everything',
  admin: 'Manage members, edit all charts, view audit log',
  editor: 'Create and edit own charts, view all charts',
  viewer: 'View-only access to all charts',
};

export const ROLE_COLORS: Record<Role, string> = {
  owner: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  admin: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  editor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  viewer: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
};

// ─── React hook for current user role ────────────────────────────────────────

// Note: In the current localStorage-only implementation, the user is always 'owner'.
// When Supabase tables are added, this will look up the role from team_members table.

export function getCurrentUserRole(): Role {
  if (typeof window === 'undefined') return 'owner';
  try {
    const stored = localStorage.getItem('contrl_current_role');
    if (stored && isValidRole(stored)) return stored;
  } catch { /* ignore */ }
  return 'owner';
}

function isValidRole(s: string): s is Role {
  return ['owner', 'admin', 'editor', 'viewer'].includes(s);
}
