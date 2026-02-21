export default function SettingsPage() {
  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and workspace preferences</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center border border-white/6 rounded-2xl bg-white/[0.01]">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center text-2xl mb-5">
          ⚙️
        </div>
        <h2 className="text-lg font-semibold text-gray-200 mb-2">Settings coming soon</h2>
        <p className="text-sm text-gray-600 max-w-xs">
          Accounts, teams, and workspace preferences will be available in a future update.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-700">
          <span className="px-3 py-1.5 rounded-full border border-white/8">User accounts</span>
          <span className="px-3 py-1.5 rounded-full border border-white/8">Team workspaces</span>
          <span className="px-3 py-1.5 rounded-full border border-white/8">Data export</span>
          <span className="px-3 py-1.5 rounded-full border border-white/8">Notifications</span>
          <span className="px-3 py-1.5 rounded-full border border-white/8">API access</span>
        </div>
      </div>
    </div>
  );
}
