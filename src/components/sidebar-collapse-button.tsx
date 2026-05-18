"use client";

import { useEffect, useSyncExternalStore } from "react";

const storageKey = "g2b-sidebar-collapsed";
const listeners = new Set<() => void>();

function applyCollapsedState(collapsed: boolean) {
  document.documentElement.dataset.sidebarCollapsed = collapsed ? "true" : "false";
}

function getCollapsedSnapshot() {
  return window.localStorage.getItem(storageKey) === "true";
}

function getServerSnapshot() {
  return false;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function SidebarCollapseButton() {
  const collapsed = useSyncExternalStore(
    subscribe,
    getCollapsedSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    applyCollapsedState(collapsed);
  }, [collapsed]);

  function toggleCollapsed() {
    const next = !collapsed;
    window.localStorage.setItem(storageKey, String(next));
    applyCollapsedState(next);
    notifyListeners();
  }

  return (
    <button
      type="button"
      className="sidebarToggle"
      onClick={toggleCollapsed}
      aria-label={collapsed ? "좌측 메뉴 펼치기" : "좌측 메뉴 접기"}
      aria-pressed={collapsed}
      title={collapsed ? "좌측 메뉴 펼치기" : "좌측 메뉴 접기"}
    >
      <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
    </button>
  );
}
