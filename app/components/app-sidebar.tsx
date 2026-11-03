"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ProoflineRole } from "../lib/proofline-api";
import { demoPersonas } from "./role-dashboard-showcase";

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

function subscribeStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("proofline:role-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("proofline:role-change", callback);
    window.removeEventListener("storage", callback);
  };
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
  const [mounted, setMounted] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("novacore");
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
      try {
        const saved = window.localStorage.getItem("proofline:active-workspace-id");
        if (saved && WORKSPACES.some((w) => w.id === saved)) {
          setActiveWorkspaceId(saved);
        }
      } catch {
        /* storage disabled */
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

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
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWorkspaceOpen]);

  const activeWorkspace = WORKSPACES.find((w) => w.id === activeWorkspaceId) ?? WORKSPACES[0];

  const handleSelectWorkspace = (w: WorkspaceOption) => {
    setActiveWorkspaceId(w.id);
    setIsWorkspaceOpen(false);
    try {
      window.localStorage.setItem("proofline:active-workspace-id", w.id);
      window.sessionStorage.setItem("proofline:active-workspace-id", w.id);
      window.dispatchEvent(new CustomEvent("proofline:workspace-change", { detail: w }));
    } catch {
      /* storage disabled */
    }
  };

  const handleAddWorkspace = () => {
    setWorkspaceNotice("Created new isolated workspace: 'VoltEdge Enterprise Pilot'. Scoped RLS rules enabled.");
    setIsWorkspaceOpen(false);
    setTimeout(() => setWorkspaceNotice(null), 4000);
  };

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

  const effectiveRoleKey = roleKey ?? (mounted ? storedRole : "legal_reviewer");
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
    { key: "findings", icon: "◌", label: "Findings", href: "/findings", badge: findingsBadge, title: "Findings · Flagged claims with 1-click fixes" },
    { key: "registry", icon: "▦", label: "Truth registry", href: "/?view=registry", isHomeView: "registry", title: "Truth registry · Official product specs and brand rules" },
    { key: "multimodal", icon: "👁", label: "Video & Visual scan", href: "/multimodal", title: "Video & Visual scanner · Check video reels, images, and readable disclaimers" },
    { key: "drift", icon: "📡", label: "Publish & Monitor", href: "/drift", title: "Publish & Live Monitor · Publish posts and track live changes" },
    { key: "sync", icon: "🔄", label: "Live Doc Sync", href: "/sync", title: "Live Doc Sync · Auto-import specs from Notion, Google Docs & Shopify" },
    { key: "impact", icon: "!", label: "Spec Change Radar", href: "/impact", title: "Spec Change Radar · See which drafts need updates when specs change" },
    { key: "insights", icon: "⌁", label: "Team Insights", href: "/insights", isHomeView: "insights", title: "Team Insights · Common issues and suggested rule updates" },
    { key: "audit-log", icon: "≋", label: "Audit log", href: "/?view=audit-log", isHomeView: "audit-log", title: "Audit log · Complete record of edits and approvals" },
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

      <div className="workspace-switcher" title="Active enterprise workspace">
        <span className="workspace-dot" />
        <span>Novacore Brand Workspace</span>
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
