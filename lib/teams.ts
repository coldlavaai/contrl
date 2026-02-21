// Teams & Workspaces — localStorage-based with Supabase-ready interfaces

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  ownerId: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
  status: 'active' | 'pending';
}

export interface PendingInvite {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invitedAt: string;
  workspaceId: string;
}

const WORKSPACES_KEY = 'contrl_workspaces';
const MEMBERS_KEY = 'contrl_team_members';
const INVITES_KEY = 'contrl_invites';
const ACTIVE_WORKSPACE_KEY = 'contrl_active_workspace';

// ─── Workspace CRUD ──────────────────────────────────────────────────────────

export function getWorkspaces(): Workspace[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getActiveWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
}

export function setActiveWorkspaceId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
}

export function createWorkspace(name: string, ownerId: string): Workspace {
  const workspaces = getWorkspaces();
  const ws: Workspace = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    ownerId,
  };
  workspaces.push(ws);
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));

  // Add owner as a team member
  const members = getTeamMembers(ws.id);
  members.push({
    id: ownerId,
    email: '', // Will be filled from auth context
    role: 'owner',
    joinedAt: new Date().toISOString(),
    status: 'active',
  });
  setTeamMembers(ws.id, members);

  // Set as active if first workspace
  if (workspaces.length === 1) {
    setActiveWorkspaceId(ws.id);
  }

  return ws;
}

export function updateWorkspace(id: string, updates: Partial<Pick<Workspace, 'name'>>): Workspace | null {
  const workspaces = getWorkspaces();
  const idx = workspaces.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  workspaces[idx] = { ...workspaces[idx], ...updates };
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
  return workspaces[idx];
}

export function deleteWorkspace(id: string): void {
  const workspaces = getWorkspaces().filter((w) => w.id !== id);
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
  // Clear members and invites
  localStorage.removeItem(`${MEMBERS_KEY}_${id}`);
  localStorage.removeItem(`${INVITES_KEY}_${id}`);
  // Reset active workspace
  if (getActiveWorkspaceId() === id) {
    const next = workspaces[0];
    if (next) setActiveWorkspaceId(next.id);
    else localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
  }
}

// ─── Team Members ────────────────────────────────────────────────────────────

export function getTeamMembers(workspaceId: string): TeamMember[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${MEMBERS_KEY}_${workspaceId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setTeamMembers(workspaceId: string, members: TeamMember[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${MEMBERS_KEY}_${workspaceId}`, JSON.stringify(members));
}

export function updateMemberRole(workspaceId: string, memberId: string, role: TeamMember['role']): void {
  const members = getTeamMembers(workspaceId);
  const idx = members.findIndex((m) => m.id === memberId);
  if (idx === -1) return;
  members[idx].role = role;
  setTeamMembers(workspaceId, members);
}

export function removeMember(workspaceId: string, memberId: string): void {
  const members = getTeamMembers(workspaceId).filter((m) => m.id !== memberId);
  setTeamMembers(workspaceId, members);
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export function getPendingInvites(workspaceId: string): PendingInvite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${INVITES_KEY}_${workspaceId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createInvite(workspaceId: string, email: string, role: PendingInvite['role']): PendingInvite {
  const invites = getPendingInvites(workspaceId);
  const invite: PendingInvite = {
    id: crypto.randomUUID(),
    email,
    role,
    invitedAt: new Date().toISOString(),
    workspaceId,
  };
  invites.push(invite);
  localStorage.setItem(`${INVITES_KEY}_${workspaceId}`, JSON.stringify(invites));
  return invite;
}

export function cancelInvite(workspaceId: string, inviteId: string): void {
  const invites = getPendingInvites(workspaceId).filter((i) => i.id !== inviteId);
  localStorage.setItem(`${INVITES_KEY}_${workspaceId}`, JSON.stringify(invites));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function ensureDefaultWorkspace(userId: string, userEmail: string): Workspace {
  const workspaces = getWorkspaces();
  if (workspaces.length > 0) {
    // Update owner email if missing
    const activeId = getActiveWorkspaceId() ?? workspaces[0].id;
    const members = getTeamMembers(activeId);
    const ownerMember = members.find((m) => m.role === 'owner');
    if (ownerMember && !ownerMember.email) {
      ownerMember.email = userEmail;
      setTeamMembers(activeId, members);
    }
    if (!getActiveWorkspaceId()) setActiveWorkspaceId(workspaces[0].id);
    return workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  }
  // Create default
  const ws = createWorkspace('My Workspace', userId);
  const members = getTeamMembers(ws.id);
  if (members.length > 0) {
    members[0].email = userEmail;
    setTeamMembers(ws.id, members);
  }
  return ws;
}
