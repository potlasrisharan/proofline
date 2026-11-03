"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProoflineRole } from "../lib/proofline-api";
import { EnterpriseSingleLogin } from "../components/role-dashboard-showcase";

export default function LoginPage() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<ProoflineRole>("legal_reviewer");

  const handleSelectRole = (role: ProoflineRole) => {
    setCurrentRole(role);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("proofline:active-role", role);
    }
    router.push("/");
  };

  return (
    <div className="login-page-wrapper">
      <header className="login-page-header">
        <Link href="/" className="login-brand-lockup" aria-label="Return to Proofline home">
          <Image src="/logo.png" alt="Proofline logo" width={34} height={34} priority />
          <span className="login-brand-text">
            <strong>Proofline</strong>
            <small>Brand truth, before publish.</small>
          </span>
        </Link>
        <Link href="/" className="login-back-link">
          ← Return to Workspace
        </Link>
      </header>

      <main className="login-page-main">
        <div className="login-page-card-container">
          <EnterpriseSingleLogin
            currentRole={currentRole}
            onSelectRole={handleSelectRole}
            onSuccess={() => router.push("/")}
          />
        </div>
      </main>

      <footer className="login-page-footer">
        <span>Proofline Enterprise Access · Novacore Workspace</span>
        <span>
          <Link href="/privacy">Privacy &amp; AI Disclosure</Link>
        </span>
      </footer>
    </div>
  );
}
