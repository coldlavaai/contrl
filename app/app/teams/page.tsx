"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Mail,
  Crown,
  Shield,
  Pencil,
  Eye,
  X,
  UserPlus,
  Building2,
  MoreVertical,
  Trash2,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Workspace,
  TeamMember,
  PendingInvite,
  getWorkspaces,
  createWorkspace,
  deleteWorkspace,
  getTeamMembers,
  getPendingInvites,
  createInvite,
  cancelInvite,
  removeMember,
  updateMemberRole,
  ensureDefaultWorkspace,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "@/lib/teams";
import { Role, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase";

const ROLE_ICONS: Record<Role, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  editor: Pencil,
  viewer: Eye,
};

export default function TeamsPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWsId, setActiveWsId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Modals
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null);

  // Load user + init
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const uid = user?.id ?? "local-user";
      const email = user?.email ?? "you@contrl.app";
      setUserId(uid);
      setUserEmail(email);
      ensureDefaultWorkspace(uid, email);
      refreshAll();
    });
  }, []);

  function refreshAll() {
    const ws = getWorkspaces();
    setWorkspaces(ws);
    const aid = getActiveWorkspaceId();
    if (aid) {
      setActiveWsId(aid);
      setMembers(getTeamMembers(aid));
      setInvites(getPendingInvites(aid));
    } else if (ws.length > 0) {
      setActiveWorkspaceId(ws[0].id);
      setActiveWsId(ws[0].id);
      setMembers(getTeamMembers(ws[0].id));
      setInvites(getPendingInvites(ws[0].id));
    }
  }

  function switchWorkspace(id: string) {
    setActiveWorkspaceId(id);
    setActiveWsId(id);
    setMembers(getTeamMembers(id));
    setInvites(getPendingInvites(id));
  }

  function handleCreateWorkspace() {
    if (!newWsName.trim()) return;
    const ws = createWorkspace(newWsName.trim(), userId);
    // Set owner email
    const m = getTeamMembers(ws.id);
    if (m.length > 0) {
      m[0].email = userEmail;
      import("@/lib/teams").then(({ setTeamMembers }) =>
        setTeamMembers(ws.id, m)
      );
    }
    setNewWsName("");
    setShowNewWs(false);
    switchWorkspace(ws.id);
    refreshAll();
  }

  function handleDeleteWorkspace(id: string) {
    if (!confirm("Delete this workspace? This cannot be undone.")) return;
    deleteWorkspace(id);
    refreshAll();
  }

  function handleInvite() {
    if (!inviteEmail.trim() || !activeWsId) return;
    createInvite(activeWsId, inviteEmail.trim(), inviteRole);
    setInviteEmail("");
    setShowInvite(false);
    refreshAll();
  }

  function handleCancelInvite(inviteId: string) {
    if (!activeWsId) return;
    cancelInvite(activeWsId, inviteId);
    refreshAll();
  }

  function handleRemoveMember(memberId: string) {
    if (!activeWsId) return;
    if (!confirm("Remove this member?")) return;
    removeMember(activeWsId, memberId);
    refreshAll();
  }

  function handleChangeRole(memberId: string, newRole: Role) {
    if (!activeWsId) return;
    updateMemberRole(activeWsId, memberId, newRole);
    setShowRoleMenu(null);
    refreshAll();
  }

  const activeWs = workspaces.find((w) => w.id === activeWsId);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Teams</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage workspaces and team members
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewWs(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Workspace
        </button>
      </div>

      {/* Workspace tabs */}
      {workspaces.length > 1 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border",
                ws.id === activeWsId
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  : "bg-white/5 text-gray-400 border-white/[0.06] hover:text-white hover:bg-white/[0.08]"
              )}
            >
              <Building2 className="h-4 w-4" />
              {ws.name}
            </button>
          ))}
        </div>
      )}

      {activeWs && (
        <div className="space-y-6">
          {/* Workspace info */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{activeWs.name}</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Created {new Date(activeWs.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {workspaces.length > 1 && activeWs.ownerId === userId && (
                  <button
                    onClick={() => handleDeleteWorkspace(activeWs.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Members section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Team Members ({members.length})
              </h3>
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Invite
              </button>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-[#111111] overflow-hidden divide-y divide-white/[0.04]">
              {members.map((member) => {
                const RoleIcon = ROLE_ICONS[member.role];
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-700/40 border border-indigo-500/30 flex items-center justify-center text-white text-xs font-bold">
                        {(member.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {member.email || "Unknown"}
                          {member.id === userId && (
                            <span className="text-xs text-gray-600 ml-2">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Role badge */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            member.role !== "owner"
                              ? setShowRoleMenu(showRoleMenu === member.id ? null : member.id)
                              : undefined
                          }
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border",
                            ROLE_COLORS[member.role],
                            member.role !== "owner" && "cursor-pointer hover:opacity-80"
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {ROLE_LABELS[member.role]}
                          {member.role !== "owner" && (
                            <ChevronDown className="h-3 w-3 ml-0.5" />
                          )}
                        </button>

                        {/* Role dropdown */}
                        {showRoleMenu === member.id && member.role !== "owner" && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-[#141414] border border-white/[0.08] rounded-lg shadow-2xl overflow-hidden z-50">
                            {(["admin", "editor", "viewer"] as Role[]).map((r) => {
                              const Icon = ROLE_ICONS[r];
                              return (
                                <button
                                  key={r}
                                  onClick={() => handleChangeRole(member.id, r)}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors text-left",
                                    member.role === r ? "text-indigo-400" : "text-gray-400"
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  <div>
                                    <p className="font-medium">{ROLE_LABELS[r]}</p>
                                    <p className="text-[10px] text-gray-600">{ROLE_DESCRIPTIONS[r]}</p>
                                  </div>
                                </button>
                              );
                            })}
                            <div className="border-t border-white/[0.06]">
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/5 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove member
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Pending Invitations ({invites.length})
              </h3>
              <div className="rounded-xl border border-white/[0.06] bg-[#111111] overflow-hidden divide-y divide-white/[0.04]">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-800 border border-white/[0.06] flex items-center justify-center">
                        <Mail className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-300">{invite.email}</p>
                        <p className="text-xs text-gray-600">
                          Invited {new Date(invite.invitedAt).toLocaleDateString()} · {ROLE_LABELS[invite.role]}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coming soon notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-0.5">
                Team collaboration coming soon
              </p>
              <p className="text-xs text-gray-500">
                Email invitations will be sent automatically when the team feature is fully deployed.
                For now, invites are stored locally as a preview of the team management experience.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New workspace modal */}
      {showNewWs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-[#111111] border border-white/[0.08] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">New Workspace</h3>
              <button
                onClick={() => setShowNewWs(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Workspace name
              </label>
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                placeholder="e.g. Production QC"
                autoFocus
                className="w-full h-10 px-4 rounded-lg text-sm bg-white/5 border border-white/[0.08] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewWs(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWsName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-[#111111] border border-white/[0.08] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Invite Team Member</h3>
              <button
                onClick={() => setShowInvite(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  placeholder="colleague@company.com"
                  autoFocus
                  className="w-full h-10 px-4 rounded-lg text-sm bg-white/5 border border-white/[0.08] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["admin", "editor", "viewer"] as const).map((r) => {
                    const Icon = ROLE_ICONS[r];
                    return (
                      <button
                        key={r}
                        onClick={() => setInviteRole(r)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors",
                          inviteRole === r
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            : "bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-gray-300 hover:bg-white/5"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {ROLE_LABELS[r]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-600 mt-2">{ROLE_DESCRIPTIONS[inviteRole]}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-5">
              <p className="text-[10px] text-gray-500">
                <span className="text-amber-400 font-semibold">Coming soon:</span>{" "}
                Email invitations will be sent automatically. For now, the invite is recorded locally.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Mail className="h-4 w-4" />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
