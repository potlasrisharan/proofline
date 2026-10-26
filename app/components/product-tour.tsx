"use client";

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

const steps: TourStep[] = [
  {
    label: "Overview",
    title: "Start with the workspace overview",
    description: "This is your control centre. Choose a role preview, see what needs attention, and follow the review workflow from source to sign-off.",
    action: "Open overview",
    href: "/",
  },
  {
    label: "Submit",
    title: "Submit one draft",
    description: "Paste a draft, name the review, and add its channel, region, language, and publication date. Use the fictional VoltEdge sample to see the workflow quickly.",
    action: "Open submit",
    href: "/submit",
  },
  {
    label: "Findings",
    title: "Read the evidence before changing anything",
    description: "Each finding shows the highlighted text, severity, reason, evidence status, and a proposed correction. Missing evidence is clearly marked for human review.",
    action: "Open findings",
    href: "/findings",
  },
  {
    label: "Review",
    title: "Fix, re-check, and request approval",
    description: "Apply or edit a correction to create a new revision, run a fresh check, then send the revision to an authorised reviewer. Nothing is auto-approved.",
    action: "Open review queue",
    href: "/?view=reviews",
  },
  {
    label: "Impact",
    title: "Check what becomes stale",
    description: "When an approved fact changes or expires, the impact radar shows registered content that needs re-review. Re-checking never edits or approves content automatically.",
    action: "Open impact radar",
    href: "/impact",
  },
  {
    label: "Insights",
    title: "Learn from repeated issues",
    description: "Governance insights group recurring findings, expiry signals, and guideline ambiguity. Proposals still require explicit brand-owner approval.",
    action: "Open insights",
    href: "/insights",
  },
  {
    label: "Trust",
    title: "Check the limits before using real data",
    description: "Open the privacy and AI disclosure page whenever you need to confirm what is local, what is synthetic, and which services are not connected yet.",
    action: "Open disclosure",
    href: "/privacy",
  },
];

const noOpSubscribe = () => () => undefined;
const clientReady = () => true;
const serverNotReady = () => false;

export function ProductTour() {
  const pathname = usePathname();
  const router = useRouter();
  const ready = useSyncExternalStore(noOpSubscribe, clientReady, serverNotReady);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const openTour = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener("proofline:open-tour", openTour);
    return () => window.removeEventListener("proofline:open-tour", openTour);
  }, []);

  const visible = ready && open;

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.localStorage.setItem(TOUR_STORAGE_KEY, "dismissed");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  function closeTour() {
    setOpen(false);
    window.localStorage.setItem(TOUR_STORAGE_KEY, "dismissed");
  }

  function goToStep(index: number) {
    const nextStep = steps[index];
    setStepIndex(index);
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

  if (!ready) return null;

  const step = steps[stepIndex];

  return (
    <>
      {!visible ? <button className="tour-launcher" type="button" onClick={() => { setStepIndex(0); setOpen(true); }}>Guided tour</button> : null}
      {visible ? (
        <div className="tour-backdrop" role="presentation" onClick={closeTour}>
          <section className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" onClick={(event) => event.stopPropagation()}>
            <div className="tour-card-top">
              <span className="tour-kicker">Proofline quick tour</span>
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
