import { SkeletonWorkspaceView } from "./components/skeleton-loader";

export default function Loading() {
  return (
    <main className="app-shell" style={{ minHeight: "100vh", background: "var(--ind-bg, #FAFAFA)" }}>
      <SkeletonWorkspaceView title="Loading Proofline Workspace..." />
    </main>
  );
}
