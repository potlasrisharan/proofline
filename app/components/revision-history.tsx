"use client";

export type ReviewRevision = {
  id: string;
  label: string;
  author: string;
  time: string;
  status: "audited" | "superseded" | "draft";
  summary: string;
  content: readonly string[];
};

type RevisionHistoryProps = {
  revisions: readonly ReviewRevision[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function RevisionHistory({ revisions, selectedId, onSelect }: RevisionHistoryProps) {
  const selectedIndex = Math.max(0, revisions.findIndex((revision) => revision.id === selectedId));
  const selected = revisions[selectedIndex];
  const previous = revisions[Math.max(0, selectedIndex - 1)];
  if (!selected || !previous) return null;

  return (
    <div className="revision-layout">
      <div className="revision-list">
        <div className="history-section-heading"><div><p className="eyebrow">Retained versions</p><h3>Revision history</h3></div><span>{revisions.length} versions</span></div>
        {revisions.slice().reverse().map((revision) => (
          <button className={`revision-item ${selected.id === revision.id ? "active" : ""}`} type="button" key={revision.id} aria-pressed={selected.id === revision.id} onClick={() => onSelect(revision.id)}>
            <span className="revision-marker">{revision.label.replace("Version ", "v").replace(" draft", "")}</span>
            <span><strong>{revision.label}</strong><small>{revision.author} · {revision.time}</small><em>{revision.summary}</em></span>
            <span className={`revision-status ${revision.status}`}>{revision.status}</span>
          </button>
        ))}
      </div>
      <div className="revision-diff">
        <div className="history-section-heading"><div><p className="eyebrow">Content diff</p><h3>{selectedIndex === 0 ? `${selected.label} · original` : `${previous.label} → ${selected.label}`}</h3></div><span className="diff-badge">Source retained</span></div>
        {selectedIndex === 0 ? <p className="tab-helper">This is the first retained revision. There is no earlier version to compare.</p> : null}
        <div className="diff-grid">
          {[previous, selected].map((revision, side) => (
            <div className="diff-column" key={`${revision.id}-${side}`}>
              <span>{side === 0 ? "Before" : "After"} · {revision.label}</span>
              {revision.content.map((line, index) => {
                const changed = previous.content[index] !== selected.content[index];
                const className = changed ? side === 0 ? "removed" : "added" : "unchanged";
                return <p className={`diff-line ${className}`} key={`${index}-${line}`}>{changed ? side === 0 ? "− " : "+ " : "· "}{line}</p>;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
