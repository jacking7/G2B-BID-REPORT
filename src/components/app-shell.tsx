import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { LegalFooter } from "@/components/legal-footer";
import { LogoutButton } from "@/components/logout-button";
import { SidebarCollapseButton } from "@/components/sidebar-collapse-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AuthUser } from "@/lib/auth";

type AppShellProps = {
  active: "settings" | "results" | "manual";
  title: string;
  description: string;
  user: AuthUser;
  actions?: ReactNode;
  children: ReactNode;
};

const navItems = [
  { href: "/results", label: "공고 목록", shortLabel: "공고", key: "results" },
  { href: "/settings", label: "설정", shortLabel: "설정", key: "settings" },
] as const;

const pageLabels: Record<AppShellProps["active"], string> = {
  results: "공고 목록",
  settings: "설정",
  manual: "사용 매뉴얼",
};

export function AppShell({
  active,
  title,
  description,
  user,
  actions,
  children,
}: AppShellProps) {
  return (
    <div className="appShell">
      <aside className="sideNav">
        <div className="brandBlock">
          <span className="brandMark">G2B</span>
          <div className="brandText">
            <strong>Bid Report</strong>
            <span>나라장터 자동 리포트</span>
          </div>
          <SidebarCollapseButton />
        </div>

        <nav aria-label="주요 메뉴">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={item.key === active ? "active" : ""}
            >
              <span className="navLabel">{item.label}</span>
              <span className="navShortLabel">{item.shortLabel}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="appFrame">
        <header className="topBar">
          <div className="topSearch" aria-label="현재 서비스">
            <span>G2B</span>
            <strong>입찰공고 운영 콘솔</strong>
          </div>
          <div className="topActions">
            <ThemeToggle />
            <Link
              href="/manual"
              className={active === "manual" ? "iconButton active" : "iconButton"}
              aria-label="사용 매뉴얼"
              title="사용 매뉴얼"
            >
              <span aria-hidden="true">?</span>
              <span className="srOnly">사용 매뉴얼</span>
            </Link>
            <Link
              href="/settings"
              className={active === "settings" ? "iconButton active" : "iconButton"}
              aria-label="설정"
              title="설정"
            >
              <span aria-hidden="true">⚙</span>
            </Link>
            <div className="userBadge">
              <span>{user.name ?? user.email}</span>
              <small>{user.role}</small>
            </div>
            <LogoutButton action={logoutAction} />
          </div>
        </header>

        <main className="consoleMain">
          <div className="breadcrumbs">
            <Link href="/results">G2B</Link>
            <span>/</span>
            <span>{pageLabels[active]}</span>
          </div>

          <section className="pageHeader">
            <div>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            {actions ? <div className="pageActions">{actions}</div> : null}
          </section>

          {children}
        </main>

        <LegalFooter />
      </div>
    </div>
  );
}
