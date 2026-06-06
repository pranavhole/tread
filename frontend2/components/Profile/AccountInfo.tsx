"use client";

import React from "react";
import { ShieldCheck, User2 } from "lucide-react";
import ProfileCard from "./ProfileCard";
import { formatDateTime } from "../../utils/format";
import type { AccountUser } from "../../features/profile/profileTypes";

type AccountInfoProps = {
  user: AccountUser | null;
};

const AccountInfo: React.FC<AccountInfoProps> = ({ user }) => {
  return (
    <ProfileCard
      title="Account"
      subtitle="Profile identity and account settings entry points."
      className="h-full"
    >
      <div className="space-y-4 px-5 py-5">
        <div className="flex items-center gap-4 rounded-2xl border border-[#2a2e39] bg-dark-bg p-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-green/15 text-brand-green">
            <User2 size={18} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-light">
              {user?.username || user?.email || "Trader"}
            </div>
            <div className="text-xs text-text-muted">{user?.email ?? "--"}</div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#2a2e39] bg-dark-bg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Email</span>
            <span className="text-text-light">{user?.email ?? "--"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Username</span>
            <span className="text-text-light">{user?.username ?? "--"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Created</span>
            <span className="text-text-light">
              {formatDateTime(user?.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Security</span>
            <span className="inline-flex items-center gap-2 text-brand-green">
              <ShieldCheck size={14} />
              Verified
            </span>
          </div>
        </div>

        <button
          type="button"
          className="w-full rounded-xl border border-[#2a2e39] bg-dark-bg px-4 py-3 text-sm text-text-light transition hover:border-brand-green/40 hover:bg-brand-highlight/30"
        >
          Change Password
        </button>
      </div>
    </ProfileCard>
  );
};

export default AccountInfo;
