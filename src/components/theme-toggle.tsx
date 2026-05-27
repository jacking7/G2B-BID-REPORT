"use client";

import { useSyncExternalStore } from "react";

const themeStorageKey = "g2b-theme";

type Theme = "light" | "dracula";

const themeOptions = [
  { key: "light", icon: "☀", label: "라이트 테마" },
  { key: "dracula", icon: "☾", label: "드라큘라 테마" },
] as const;

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "dracula";
  }

  const stored = window.localStorage.getItem(themeStorageKey);
  return stored === "light" || stored === "dracula" ? stored : "dracula";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(themeStorageKey, theme);
  window.dispatchEvent(new Event("g2b-theme-change"));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("g2b-theme-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("g2b-theme-change", onStoreChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getStoredTheme, () => "dracula");

  return (
    <div className="themeToggle" role="group" aria-label="테마 선택">
      {themeOptions.map((item) => (
        <button
          key={item.key}
          type="button"
          className={item.key === theme ? "active" : ""}
          aria-label={item.label}
          aria-pressed={item.key === theme}
          title={item.label}
          onClick={() => {
            applyTheme(item.key);
          }}
        >
          <span className="themeIcon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="srOnly">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
