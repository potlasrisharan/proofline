"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ProoflineRole } from "../lib/proofline-api";
import { demoPersonas } from "./role-dashboard-showcase";
import { getStoredContentReview, latestAudit } from "../lib/content-review";

export type NavKey =
  | "overview"
  | "reviews"
  | "submit"
  | "findings"
  | "registry"
  | "multimodal"
  | "drift"
  | "sync"
  | "impact"
  | "insights"
  | "audit-log"
  | "privacy"
  | "portal";

export type WorkspaceOption = {
  id: string;
  name: string;
  badge: "production" | "staging" | "dev" | "partner";
  badgeLabel: string;
  description: string;
  dotColor: string;
  specsCount: number;
  status: string;
};

export const WORKSPACES: WorkspaceOption[] = [
  {
    id: "novacore",
    name: "Novacore Brand Workspace",
    badge: "production",
    badgeLabel: "PROD",
    description: "Production ultrabooks, AI hardware & launch campaigns",
    dotColor: "#22C55E",
    specsCount: 14,
    status: "Active · RLS Enforced",
  },
  {
    id: "voltedge-labs",
    name: "VoltEdge Labs R&D",
    badge: "staging",
    badgeLabel: "STAGING",
    description: "Battery benchmarks & prototype devices",
    dotColor: "#3B82F6",
    specsCount: 8,
    status: "Sandbox · Internal",
  },
  {
    id: "audio-wearables",
    name: "VoltEdge Audio & Wearables",
    badge: "dev",
    badgeLabel: "DEV",
    description: "Noise-cancelling headphones & mobile accessories",
    dotColor: "#F59E0B",
    specsCount: 6,
    status: "Review Pending",
  },
  {
    id: "global-retail",
    name: "Global Retail & Agency Hub",
    badge: "partner",
    badgeLabel: "PARTNER",
    description: "External ad agencies & retail store collateral",
    dotColor: "#8B5CF6",
    specsCount: 11,
    status: "Guest Isolation",
  },
];

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
    const review = getStoredContentReview();
    if (!review) return null;
    const audit = latestAudit(review);
    const open = audit?.findings?.filter((f) => f.status === "open")?.length;
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

function subscribeStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("proofline:role-change", callback);
  window.addEventListener("proofline:workspace-change", callback);
  window.addEventListener("proofline:review-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("proofline:role-change", callback);
    window.removeEventListener("proofline:workspace-change", callback);
    window.removeEventListener("proofline:review-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function getStoredWorkspace(): string {
  if (typeof window === "undefined") return "novacore";
  try {
    const saved = window.localStorage.getItem("proofline:active-workspace-id");
    if (saved && WORKSPACES.some((w) => w.id === saved)) return saved;
  } catch {
    /* storage disabled */
  }
  return "novacore";
}

export function AppSidebar({
  activeKey,
  onNavigateView,
  openReviewCount = 3,
  currentRole,
  roleKey,
  onSwitchRole,
}: AppSidebarProps) {
  const router = useRouter();
  const mounted = useMounted();
  const switcherRef = useRef<HTMLDivElement>(null);
  const activeWorkspaceId = useSyncExternalStore(
    subscribeStorage,
    getStoredWorkspace,
    () => "novacore"
  );
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const storedRole = useSyncExternalStore(
    subscribeStorage,
    () => getStoredRole(roleKey ?? "legal_reviewer"),
    () => roleKey ?? "legal_reviewer"
  );
  const findingsBadge = useSyncExternalStore(
    subscribeStorage,
    getStoredFindingsBadge,
    () => null
  );

  useEffect(() => {
    if (!isWorkspaceOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setIsWorkspaceOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsWorkspaceOpen(false);
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWorkspaceOpen]);

  const activeWorkspace = WORKSPACES.find((w) => w.id === activeWorkspaceId) ?? WORKSPACES[0];

  const handleSelectWorkspace = (w: WorkspaceOption) => {
    setIsWorkspaceOpen(false);
    try {
      window.localStorage.setItem("proofline:active-workspace-id", w.id);
      window.sessionStorage.setItem("proofline:active-workspace-id", w.id);
      window.dispatchEvent(new CustomEvent("proofline:workspace-change", { detail: w }));
    } catch {
      /* storage disabled */
    }
    setWorkspaceNotice(`Switched to: ${w.name}`);
    setTimeout(() => setWorkspaceNotice(null), 3000);
  };

  const handleAddWorkspace = () => {
    setWorkspaceNotice("Created new isolated workspace: 'VoltEdge Enterprise Pilot'. Scoped RLS rules enabled.");
    setIsWorkspaceOpen(false);
    setTimeout(() => setWorkspaceNotice(null), 4000);
  };

  const effectiveRoleKey: ProoflineRole = roleKey ?? (mounted ? storedRole : "legal_reviewer");
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
    isHomeView?: "overview" | "reviews" | "registry" | "insights" | "audit-log" | "portal";
    badge?: number | null;
    title: string;
  }> = [
    { key: "portal", icon: "⊞", label: "Role Dashboards", href: "/dashboards", isHomeView: "portal", title: "Role Dashboards · 5 dedicated team workspaces" },
    { key: "reviews", icon: "◇", label: "Review queue", href: "/?view=reviews", isHomeView: "reviews", badge: openReviewCount, title: "Review queue · Review drafts and approve revisions" },
    { key: "findings", icon: "◌", label: "Findings", href: "/findings", badge: mounted ? findingsBadge : null, title: "Findings & Flagged Issues · Claims that need review or 1-click fixes" },
    { key: "registry", icon: "▦", label: "Truth registry", href: "/?view=registry", isHomeView: "registry", title: "Truth Registry (Approved Specs) · Official product specs and brand rules" },
    { key: "multimodal", icon: "👁", label: "Visual & video scan", href: "/multimodal", title: "Visual & Video Scanner · Check video reels, images, and readable disclaimers" },
    { key: "drift", icon: "📡", label: "Publish & monitor", href: "/drift", title: "Publish & Live Monitor · Safe publishing and post tracking" },
    { key: "sync", icon: "🔄", label: "Live doc sync", href: "/sync", title: "Live Doc Sync · Auto-import specs from Notion, Google Docs & Shopify" },
    { key: "impact", icon: "!", label: "Spec change radar", href: "/impact", title: "Spec Change Radar · Alerts you when a spec update affects your drafts" },
    { key: "insights", icon: "⌁", label: "Team insights", href: "/insights", isHomeView: "insights", title: "Team Insights · Common issues and suggested rule updates" },
    { key: "audit-log", icon: "≋", label: "Audit log", href: "/?view=audit-log", isHomeView: "audit-log", title: "Audit Log (Audit Trail) · Complete record of edits and approvals" },
  ];

  return (
    <aside className="sidebar" aria-label="Enterprise workspace navigation">
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
          <span className="brand-name"><span style={{ fontFamily: "var(--ind-font-serif, 'Playfair Display', Georgia, serif)", fontStyle: "italic", fontWeight: 400, textTransform: "none", marginRight: 4, letterSpacing: "-0.02em" }}>PROOF</span>LINE</span>
          <span className="brand-caption">Brand truth, before publish.</span>
        </span>
      </Link>

      <div className="workspace-switcher-wrap" ref={switcherRef} suppressHydrationWarning>
        <button
          type="button"
          className={`workspace-switcher ${isWorkspaceOpen ? "open" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsWorkspaceOpen((prev) => !prev);
          }}
          title={`Active brand workspace: ${activeWorkspace.name}. Click to switch workspace.`}
          aria-haspopup="listbox"
          aria-expanded={isWorkspaceOpen}
          aria-label="Switch brand workspace"
        >
          <span
            className="workspace-dot"
            style={{
              background: activeWorkspace.dotColor,
              boxShadow: `0 0 6px ${activeWorkspace.dotColor}`,
            }}
          />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {activeWorkspace.name}
          </span>
          <span className="chevron" aria-hidden="true">
            ⌄
          </span>
        </button>

        {isWorkspaceOpen && (
          <div className="workspace-dropdown-menu" role="listbox" aria-label="Available Brand Workspaces">
            <div className="workspace-dropdown-header">
              <span className="workspace-dropdown-kicker">Brand Workspaces</span>
              <span className="workspace-dropdown-sub">Isolated specs, rules &amp; team access</span>
            </div>

            <div className="workspace-options-list">
              {WORKSPACES.map((w) => {
                const isSelected = w.id === activeWorkspace.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={`workspace-option-btn ${isSelected ? "active" : ""}`}
                    onClick={() => handleSelectWorkspace(w)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="workspace-option-top">
                      <span
                        className="workspace-dot"
                        style={{
                          background: w.dotColor,
                          boxShadow: `0 0 5px ${w.dotColor}`,
                        }}
                      />
                      <span className="workspace-option-name">{w.name}</span>
                      <span className={`workspace-badge-tag ${w.badge}`}>{w.badgeLabel}</span>
                      {isSelected && <span style={{ color: "#22C55E", fontSize: 11, marginLeft: "auto" }}>✓</span>}
                    </div>
                    <div className="workspace-option-desc">{w.description}</div>
                    <div className="workspace-option-meta">
                      <span>{w.specsCount} approved specs</span>
                      <span>{w.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="workspace-dropdown-footer">
              <button
                type="button"
                className="workspace-add-btn"
                onClick={handleAddWorkspace}
                title="Create a new isolated brand workspace"
              >
                ＋ New Brand Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {workspaceNotice && (
        <div
          role="status"
          style={{
            margin: "0 0 10px",
            padding: "8px 10px",
            background: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            borderRadius: 4,
            color: "#4ADE80",
            fontSize: 9.5,
            fontFamily: "var(--ind-font-mono, monospace)",
            lineHeight: 1.4,
          }}
        >
          ✓ {workspaceNotice}
        </div>
      )}

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
          suppressHydrationWarning
        >
          <div className={`avatar persona-avatar ${persona.badgeTone}`}>{persona.initials}</div>
          <div className="profile-text">
            <strong>{persona.name}</strong>
            <small>{persona.title}{currentRole && currentRole !== persona.title ? ` · ${currentRole}` : ""}</small>
          </div>
          <span className="more" aria-hidden="true" title="Switch role">⇄</span>
        </button>
      </div>
    </aside>
  );
}
