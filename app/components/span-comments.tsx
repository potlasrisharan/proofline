"use client";

import type { ProoflineRole } from "../lib/proofline-api";

export type VersionedSpanComment = {
  id: string;
  findingId: string;
  author: string;
  role: ProoflineRole;
  text: string;
  time: string;
  contentVersion: string;
};

type CommentFinding = {
  id: string;
  category: string;
  severity: string;
  excerpt: string;
  evidenceStatus: string;
  span: { start: number; end: number; text: string };
};

type SpanCommentsProps = {
  findings: readonly CommentFinding[];
  selectedId: string;
  onSelect: (id: string) => void;
  comments: readonly VersionedSpanComment[];
  canComment: boolean;
  roleLabels: Record<ProoflineRole, string>;
  draft: string;
  onDraftChange: (value: string) => void;
  onAddComment: () => void;
};

export function SpanComments({ findings, selectedId, onSelect, comments, canComment, roleLabels, draft, onDraftChange, onAddComment }: SpanCommentsProps) {
  const selected = findings.find((finding) => finding.id === selectedId) ?? findings[0];
  if (!selected) return null;
  const thread = comments.filter((comment) => comment.findingId === selected.id);

  return (
    <section className="span-comment-panel" aria-labelledby="span-comments-heading">
      <div className="span-comment-heading"><div><p className="eyebrow">Collaboration</p><h3 id="span-comments-heading">Comments on this span</h3></div><span className="comment-count">{thread.length}</span></div>
      <div className="comment-index" aria-label="Choose a commented span">
        {findings.map((finding) => <button className={`comment-index-item ${selected.id === finding.id ? "active" : ""}`} type="button" key={finding.id} aria-pressed={selected.id === finding.id} onClick={() => onSelect(finding.id)}><span className={`status-dot ${finding.severity}`} />{finding.category}<span>{comments.filter((comment) => comment.findingId === finding.id).length}</span></button>)}
      </div>
       <div className="selected-span"><span>Original audited span · Versioned content</span><strong>{selected.excerpt}</strong><small>Characters {selected.span.start}–{selected.span.end} · {selected.evidenceStatus}</small></div>
      <div className="comment-thread">
        {thread.length === 0 ? <p className="empty-comment">No comments yet. Add the first note for this span.</p> : thread.map((comment) => <article className="comment-item" key={comment.id}><div className="comment-avatar" aria-hidden="true">{comment.author.split(" ").map((name) => name[0]).join("")}</div><div><div className="comment-meta"><strong>{comment.author}</strong><span>{roleLabels[comment.role]}</span><time>{comment.time}</time><span>{comment.contentVersion}</span></div><p>{comment.text}</p></div></article>)}
      </div>
      {canComment ? <div className="comment-composer"><label htmlFor="span-comment">Add a comment<textarea id="span-comment" value={draft} maxLength={2000} onChange={(event) => onDraftChange(event.target.value)} placeholder="Explain the evidence, intent, or next action…" rows={3} /></label><button className="small-button apply-button" type="button" disabled={!draft.trim()} onClick={onAddComment}>Add comment</button></div> : <p className="permission-note">Comments are read-only for this role.</p>}
    </section>
  );
}
