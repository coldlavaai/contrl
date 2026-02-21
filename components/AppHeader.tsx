"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";

interface AppHeaderProps {
  sidebarCollapsed: boolean;
}

export default function AppHeader({ sidebarCollapsed }: AppHeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Load user on mount
  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  // Display name: first part of email or "User"
  const displayName = userEmail
    ? userEmail.split("@")[0]
    : "User";
  const avatarLetter = displayName[0]?.toUpperCase() ?? "U";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14">
      <div className="h-full bg-[#0a0a0a] border-b border-white/[0.06] flex items-center">
        {/* Logo section — matches sidebar width */}
        <Link
          href="/app"
          className={cn(
            "h-full flex items-center px-4 border-r border-white/[0.06] hover:bg-white/5 transition-colors shrink-0",
            sidebarCollapsed ? "w-16 justify-center" : "w-64"
          )}
        >
          {sidebarCollapsed ? (
            <span className="text-indigo-400 font-black text-lg">C</span>
          ) : (
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold text-white tracking-tight">Contrl</span>
              <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">
                SPC Analytics
              </span>
            </div>
          )}
        </Link>

        {/* Center — Search */}
        <div className="flex-1 flex items-center px-4">
          <div className="w-full max-w-sm">
            <div
              className={cn(
                "relative flex items-center transition-all duration-200",
                searchFocused ? "scale-[1.01]" : ""
              )}
            >
              <Search className="absolute left-3 h-4 w-4 text-gray-500" />
              <input
                type="search"
                placeholder="Search charts… (⌘K)"
                className={cn(
                  "w-full h-9 pl-9 pr-4 rounded-lg text-sm",
                  "bg-white/5 border border-white/[0.08]",
                  "text-gray-200 placeholder:text-gray-600",
                  "focus:outline-none focus:bg-white/[0.07] focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10",
                  "transition-all duration-200"
                )}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-1 px-4">
          {/* Notification bell */}
          <button className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Bell className="h-5 w-5" />
          </button>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-700/60 border border-indigo-500/40 flex items-center justify-center text-white text-xs font-bold select-none">
                {avatarLetter}
              </div>
              <span className="text-sm font-medium text-gray-200 hidden md:inline max-w-[120px] truncate">
                {userEmail ?? "User"}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500 hidden md:block" />
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#141414] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-3 border-b border-white/[0.06]">
                  <p className="font-semibold text-white text-sm truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{userEmail ?? "Contrl Account"}</p>
                </div>
                <div className="p-1.5">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push("/app/settings");
                    }}
                  >
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span>Settings</span>
                  </button>
                  <div className="my-1 h-px bg-white/[0.06]" />
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg transition-colors"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
