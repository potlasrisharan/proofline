"use client";

import { useEffect } from "react";

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]';

/** Keeps the existing demo dialogs keyboard-contained without changing their actions. */
export function ModalAccessibility() {
  useEffect(() => {
    let activeDialog: HTMLElement | null = null;
    let previouslyFocused: HTMLElement | null = null;
    let focusTimer: number | undefined;
    let previousOverflow = "";
    let inactiveElements: { element: HTMLElement; wasInert: boolean }[] = [];

    function restoreBackground() {
      for (const { element, wasInert } of inactiveElements) {
        if (!wasInert) element.removeAttribute("inert");
      }
      inactiveElements = [];
      document.body.style.overflow = previousOverflow;
    }

    function syncDialog() {
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
      const nextDialog = dialogs[dialogs.length - 1] ?? null;
      if (nextDialog === activeDialog) return;

      if (activeDialog) {
        window.clearTimeout(focusTimer);
        restoreBackground();
        if (previouslyFocused?.isConnected) previouslyFocused.focus();
      }

      activeDialog = nextDialog;
      if (!activeDialog) return;

      previouslyFocused = document.activeElement as HTMLElement | null;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      inactiveElements = Array.from(document.querySelectorAll<HTMLElement>(".app-shell > .sidebar, .app-shell > .main-content"))
        .filter((element) => !element.contains(activeDialog))
        .map((element) => ({ element, wasInert: element.hasAttribute("inert") }));
      for (const { element } of inactiveElements) element.setAttribute("inert", "");
      focusTimer = window.setTimeout(() => {
        (activeDialog?.querySelector<HTMLElement>(focusableSelector) ?? activeDialog)?.focus();
      }, 0);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!activeDialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        activeDialog.querySelector<HTMLButtonElement>(".modal-close")?.click();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(activeDialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.getClientRects().length > 0 && !element.closest("[inert]"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        activeDialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    const observer = new MutationObserver(syncDialog);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", handleKeyDown, true);
    syncDialog();

    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", handleKeyDown, true);
      window.clearTimeout(focusTimer);
      if (activeDialog) restoreBackground();
    };
  }, []);

  return null;
}
