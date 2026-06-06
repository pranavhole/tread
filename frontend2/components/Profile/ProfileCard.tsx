"use client";

import React from "react";

type ProfileCardProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const ProfileCard: React.FC<ProfileCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
}) => {
  return (
    <section
      className={`rounded-2xl border border-[#2a2e39] bg-dark-panel/95 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${className}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[#2a2e39] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-text-light">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
};

export default ProfileCard;
