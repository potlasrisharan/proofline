import { SkeletonWorkspaceView } from "../components/skeleton-loader";

export default function PrivacyLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--ind-bg, #FAFAFA)", padding: "24px 32px" }}>
      <SkeletonWorkspaceView title="Loading Privacy & AI Disclosure Transparency..." />
    </div>
  );
}
