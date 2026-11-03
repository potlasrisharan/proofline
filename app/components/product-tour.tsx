"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

type TourStep = {
  label: string;
  title: string;
  description: string;
  action: string;
  href: string;
};

const TOUR_STORAGE_KEY = "proofline-guided-tour-v1";
const TOUR_ACTIVE_KEY = "proofline-tour-active-v1";
const TOUR_STEP_KEY = "proofline-tour-step-v1";

const steps: TourStep[] = [
  {
    label: "Overview",
    title: "Start with the workspace overview",
    description: "Your control center for marketing accuracy. Switch between 5 dedicated team workspaces, test sample marketing drafts, and see the full review workflow.",
    action: "Open overview",
    href: "/",
  },
  {
    label: "Submit",
    title: "Submit one draft",
    description: "Paste marketing copy or upload a file. Pick your channel (social, email, blog) and test 1-click sample drafts with real spec checks.",
    action: "Open submit",
    href: "/submit",
  },
  {
    label: "Findings",
    title: "Read the evidence before changing anything",
    description: "Every flagged claim shows the exact spec mismatch, advertising rule, and an approved 1-click fix backed by verified lab tests.",
    action: "Open findings",
    href: "/findings",
  },
  {
    label: "Review",
    title: "Apply safe rewrites & approve",
    description: "Apply suggested fixes in 1 click, re-run checks instantly, and submit to brand reviewers. Full audit history is saved permanently.",
    action: "Open Review Queue",
    href: "/?view=reviews",
  },
  {
    label: "Impact",
    title: "Spec Change Radar",
    description: "When engineers update product specs or promotional discounts expire, Proofline automatically highlights every live draft that needs updating.",
    action: "Open Spec Radar",
    href: "/impact",
  },
  {
    label: "Insights",
    title: "Team Insights & Better Guidelines",
    description: "See the most common issues your team runs into and approve clearer brand rules with 1 click so creators write accurate copy faster.",
    action: "View Team Insights",
    href: "/insights",
  },
  {
    label: "Trust",
    title: "Full Privacy & AI Transparency",
    description: "Proofline never trains on your data. View our AI disclosure, server-side data boundaries, and audit trail guarantees.",
    action: "View Transparency & Privacy",
    href: "/privacy",
  },
];

const tourListeners = new Set<() => void>();
function notifyTourListeners() {
  tourListeners.forEach((l) => l());
}
function subscribeTour(callback: () => void) {
  tourListeners.add(callback);
  const handleOpenEvent = () => {
    try {
      window.sessionStorage.setItem(TOUR_ACTIVE_KEY, "true");
      window.sessionStorage.setItem(TOUR_STEP_KEY, "0");
    } catch { /* storage disabled */ }
    callback();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("proofline:open-tour", handleOpenEvent);
    window.addEventListener("storage", callback);
  }
  return () => {
    tourListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("proofline:open-tour", handleOpenEvent);
      window.removeEventListener("storage", callback);
    }
  };
}

function getTourActiveSnapshot() {
  if (typeof window === "undefined") return false;
  try { return window.sessionStorage.getItem(TOUR_ACTIVE_KEY) === "true"; }
  catch { return false; }
}

function getTourStepSnapshot() {
  if (typeof window === "undefined") return 0;
  try {
    const saved = parseInt(window.sessionStorage.getItem(TOUR_STEP_KEY) || "0", 10);
    return isNaN(saved) ? 0 : saved;
  } catch { return 0; }
}

export function ProductTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const open = useSyncExternalStore(subscribeTour, getTourActiveSnapshot, () => false);
  const stepIndex = useSyncExternalStore(subscribeTour, getTourStepSnapshot, () => 0);

  const visible = mounted && open;

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTour();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  function closeTour() {
    try {
      window.sessionStorage.removeItem(TOUR_ACTIVE_KEY);
      window.sessionStorage.removeItem(TOUR_STEP_KEY);
      window.localStorage.setItem(TOUR_STORAGE_KEY, "dismissed");
    } catch { /* session storage disabled */ }
    notifyTourListeners();
  }

  function startTour() {
    try {
      window.sessionStorage.setItem(TOUR_ACTIVE_KEY, "true");
      window.sessionStorage.setItem(TOUR_STEP_KEY, "0");
    } catch { /* session storage disabled */ }
    notifyTourListeners();
  }

  function goToStep(index: number) {
    const nextStep = steps[index];
    try {
      window.sessionStorage.setItem(TOUR_ACTIVE_KEY, "true");
      window.sessionStorage.setItem(TOUR_STEP_KEY, String(index));
    } catch { /* session storage disabled */ }
    notifyTourListeners();
    if (nextStep.href !== pathname) router.push(nextStep.href);
  }

  function nextStep() {
    if (stepIndex === steps.length - 1) {
      closeTour();
      return;
    }
    goToStep(stepIndex + 1);
  }

  function previousStep() {
    if (stepIndex === 0) return;
    goToStep(stepIndex - 1);
  }

  if (!mounted) return null;

  const step = steps[stepIndex];

  return (
    <>
      {!visible ? <button className="tour-launcher" type="button" onClick={startTour}>Guided tour</button> : null}
      {visible ? (
        <div className="tour-backdrop" role="presentation" onClick={closeTour}>
          <section className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" onClick={(event) => event.stopPropagation()}>
            <div className="tour-card-top">
              <span className="tour-kicker" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <Image src="/logo.png" alt="Proofline" width={16} height={16} style={{ borderRadius: 3, border: "1px solid rgba(0,0,0,0.1)" }} />
                Proofline quick tour
              </span>
              <button className="tour-close" type="button" onClick={closeTour} aria-label="Close guided tour">×</button>
            </div>
            <div className="tour-progress" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
              <span>Step {stepIndex + 1} of {steps.length}</span>
              <div className="tour-progress-track"><span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
            </div>
            <p className="tour-step-label">{step.label}</p>
            <h2 id="tour-title">{step.title}</h2>
            <p className="tour-description">{step.description}</p>
            <p className="tour-location">This step opens <strong>{step.href}</strong>.</p>
            <div className="tour-dots" aria-label="Tour steps">
              {steps.map((item, index) => <button key={item.label} className={index === stepIndex ? "active" : ""} type="button" aria-label={`Go to ${item.label}`} aria-current={index === stepIndex ? "step" : undefined} onClick={() => goToStep(index)} />)}
            </div>
            <div className="tour-actions">
              <button className="ghost-button" type="button" onClick={closeTour}>Skip tour</button>
              <div className="tour-actions-right">
                <button className="ghost-button" type="button" onClick={previousStep} disabled={stepIndex === 0}>Back</button>
                <button className="primary-button" type="button" onClick={nextStep}>{stepIndex === steps.length - 1 ? "Finish tour" : step.action}</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
