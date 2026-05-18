"use client";

import { useSyncExternalStore } from "react";

const themeStorageKey = "g2b-theme";
const themes = ["light", "dracula"] as const;

type Theme = (typeof themes)[number];

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
      {themes.map((item) => (
        <button
          key={item}
          type="button"
          className={item === theme ? "active" : ""}
          onClick={() => {
            applyTheme(item);
          }}
        >
          {item === "light" ? "White" : "Dracula"}
        </button>
      ))}
    </div>
  );
}
