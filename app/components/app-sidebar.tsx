"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProoflineRole } from "../lib/proofline-api";
import { demoPersonas } from "./role-dashboard-showcase";

export type NavKey =
  | "overview"
  | "reviews"
  | "submit"
  | "findings"
  | "registry"
  | "impact"
  | "insights"
  | "audit-log"
  | "privacy"
  | "portal";

type AppSidebarProps = {
  activeKey: NavKey;
  onNavigateView?: (view: "overview" | "reviews" | "registry" | "insights" | "audit-log" | "portal") => void;
  openReviewCount?: number;
  currentRole?: string;
  roleKey?: ProoflineRole;
  onSwitchRole?: () => void;
};

function getStoredFindingsBadge(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("proofline:review:v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const audits = parsed?.audits;
    const latest = audits?.[audits.length - 1];
    const open = latest?.findings?.filter((f: { status: string }) => f.status === "open")?.length;
    return typeof open === "number" && open > 0 ? open : null;
  } catch {
    return null;
  }
}

function getStoredRole(fallback: ProoflineRole): ProoflineRole {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = (sessionStorage.getItem("proofline:active-role") || localStorage.getItem("proofline:active-role")) as ProoflineRole | null;
    if (stored && demoPersonas[stored]) {
      return stored;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function AppSidebar({
  activeKey,
  onNavigateView,
  openReviewCount = 3,
  currentRole = "Authorised reviewer",
  roleKey,
  onSwitchRole,
}: AppSidebarProps) {
  const router = useRouter();
  const [storedRole] = useState<ProoflineRole>(() => getStoredRole(roleKey ?? "legal_reviewer"));
  const [findingsBadge] = useState<number | null>(getStoredFindingsBadge);

  const effectiveRoleKey = roleKey ?? storedRole;
  const persona = demoPersonas[effectiveRoleKey] ?? demoPersonas.legal_reviewer;

  const handleRoleSwitch = () => {
    if (onSwitchRole) {
      onSwitchRole();
    } else {
      router.push("/?openSwitchRole=true");
    }
  };

  const navItems: Array<{
    key: NavKey;
    icon: string;
    label: string;
    href: string;
    isHomeView?: "overview" | "reviews" | "registry" | "insights" | "audit-log";
    badge?: number | null;
    title: string;
  }> = [
    { key: "overview", icon: "◈", label: "Overview", href: "/", isHomeView: "overview", title: "Overview · Workspace summary and quality gate status" },
    { key: "reviews", icon: "◇", label: "Review queue", href: "/?view=reviews", isHomeView: "reviews", badge: openReviewCount, title: "Review queue · Inspect and approve pending drafts" },
    { key: "findings", icon: "◌", label: "Findings", href: "/findings", badge: findingsBadge, title: "Findings · Flagged claims with 1-click suggested fixes" },
    { key: "registry", icon: "▦", label: "Truth registry", href: "/?view=registry", isHomeView: "registry", title: "Truth registry · Official specs and approved brand facts" },
    { key: "impact", icon: "!", label: "Impact radar", href: "/impact", title: "Impact radar · See what drafts break when specs change" },
    { key: "insights", icon: "⌁", label: "Governance insights", href: "/insights", isHomeView: "insights", title: "Governance insights · Mistake trends and rule clarifications" },
    { key: "audit-log", icon: "≋", label: "Audit log", href: "/?view=audit-log", isHomeView: "audit-log", title: "Audit log · Tamper-proof cryptographic record of decisions" },
    { key: "privacy", icon: "🛡", label: "Privacy & AI disclosure", href: "/privacy", title: "Privacy & AI disclosure · How AI and data are handled" },
  ];

  return (
    <aside className="sidebar" aria-label="VoltEdge workspace navigation">
      <Link className="brand-lockup pl-brand-link" href="/" prefetch={false} aria-label="Proofline Home">
        <Image
          src="/logo.png"
          alt="Proofline logo"
          className="brand-logo-img"
          width={36}
          height={36}
          priority
        />
        <span className="brand-text-col">
          <span className="brand-name">Proofline</span>
          <span className="brand-caption">Brand truth, before publish.</span>
        </span>
      </Link>

      <div className="workspace-switcher" title="Active enterprise workspace">
        <span className="workspace-dot" />
        <span>VoltEdge workspace</span>
        <span className="chevron" aria-hidden="true">⌄</span>
      </div>

      <Link
        className={`nav-action-btn ${activeKey === "submit" ? "active" : ""}`}
        href="/submit"
        prefetch={false}
        aria-current={activeKey === "submit" ? "page" : undefined}
        title="Check a new marketing draft or announcement against brand specs"
      >
        <span aria-hidden="true">＋</span>
        <span>Submit content</span>
      </Link>

      <nav className="nav-list" aria-label="Primary">
        {navItems.map((item) => {
          const isActive = activeKey === item.key;
          if (onNavigateView && item.isHomeView) {
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onNavigateView(item.isHomeView!)}
                title={item.title}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
                {item.badge && item.badge > 0 ? <b>{item.badge}</b> : null}
              </button>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              className={`nav-item ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              title={item.title}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.badge && item.badge > 0 ? <b>{item.badge}</b> : null}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button
          className="profile-card profile-card-button"
          type="button"
          onClick={handleRoleSwitch}
          title="Click to switch demo role / credentials"
        >
          <div className={`avatar persona-avatar ${persona.badgeTone}`}>{persona.initials}</div>
          <div className="profile-text">
            <strong>{persona.name}</strong>
            <small>{persona.title} ({currentRole})</small>
          </div>
          <span className="more" aria-hidden="true" title="Switch role">⇄</span>
        </button>
      </div>
    </aside>
  );
}
