"use client";

type StateKind = "empty" | "loading" | "error";

type StatePanelProps = {
  kind: StateKind;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

const stateLabels: Record<StateKind, string> = {
  empty: "Nothing here yet",
  loading: "Working",
  error: "Review required",
};

const stateIcons: Record<StateKind, string> = {
  empty: "○",
  loading: "↻",
  error: "!",
};

export function StatePanel({
  kind,
  title,
  description,
  actionLabel,
  onAction,
}: StatePanelProps) {
  return (
    <div
      className={`state-panel state-${kind}`}
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      aria-busy={kind === "loading" ? true : undefined}
    >
      <span className="state-icon" aria-hidden="true">
        {stateIcons[kind]}
      </span>
      <div className="state-copy">
        <span className="state-label">{stateLabels[kind]}</span>
        <strong>{title}</strong>
        <p>{description}</p>
        {actionLabel && onAction ? (
          <button className="small-button state-action" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
