"use client";

type PreviewFinding = {
  id: string;
  category: string;
  span: { text: string };
  resolved: boolean;
  suggestion: string;
  actionStatus?: "open" | "accepted" | "edited" | "dismissed";
};

type ReviewContentPreviewProps = {
  content: string;
  contentVersion: string;
  findings: readonly PreviewFinding[];
  selectedSpanId: string;
  onSelectSpan: (id: string) => void;
};

export function suggestionReplacement(suggestion: string) {
  return /[“"]([^”"]+)[”"]/.exec(suggestion)?.[1] ?? suggestion.trim();
}

export function ReviewContentPreview({ content, contentVersion, findings, selectedSpanId, onSelectSpan }: ReviewContentPreviewProps) {
  const spans = findings.flatMap((finding) => {
    const corrected = finding.resolved && finding.actionStatus !== "dismissed";
    const text = corrected ? suggestionReplacement(finding.suggestion) : finding.span.text;
    const start = content.indexOf(text);
    return start === -1 ? [] : [{ ...finding, text, start, end: start + text.length }];
  }).sort((left, right) => left.start - right.start);
  const parts = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start < cursor) continue;
    parts.push(content.slice(cursor, span.start));
    parts.push(<button key={span.id} type="button" className={`span-mark ${span.resolved ? "resolved-mark" : "flagged-mark"} ${selectedSpanId === span.id ? "selected" : ""}`} aria-label={`Open comments: ${span.category}`} aria-pressed={selectedSpanId === span.id} onClick={() => onSelectSpan(span.id)}>{span.text}</button>);
    cursor = span.end;
  }
  parts.push(content.slice(cursor));

  return (
    <div className="content-preview-card">
      <div className="content-preview-header"><span className="content-type">VoltEdge launch copy · synthetic demo</span><span className="content-version">{contentVersion}</span></div>
      <p className="review-submitted-text">{parts}</p>
      <div className="content-footer"><span>Select a highlighted span to open its comments.</span><span>Original revisions retained</span></div>
    </div>
  );
}
