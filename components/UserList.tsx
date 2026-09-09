"use client";

import { Profile } from "@/types";

interface UserListProps {
  users: Profile[];
  selectedUserId: string | null;
  onSelect: (user: Profile) => void;
  unreadCounts: Record<string, number>;
  currentUserName: string;
  onLogout: () => void;
}

export default function UserList({
  users,
  selectedUserId,
  onSelect,
  unreadCounts,
  currentUserName,
  onLogout,
}: UserListProps) {
  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">
            Signed in as
          </p>
          <p className="truncate font-semibold">{currentUserName}</p>
        </div>
        <button
          onClick={onLogout}
          className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          Log out
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {users.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            No other users have signed up yet.
          </p>
        )}
        {users.map((u) => {
          const isSelected = u.userId === selectedUserId;
          const unread = unreadCounts[u.userId] || 0;
          return (
            <button
              key={u.$id}
              onClick={() => onSelect(u)}
              className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition ${
                isSelected ? "bg-brand-50" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {u.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {u.name}
                </p>
                <p className="truncate text-xs text-slate-400">{u.email}</p>
              </div>
              {unread > 0 && (
                <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
