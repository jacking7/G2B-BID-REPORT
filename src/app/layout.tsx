import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "G2B Bid Report",
  description: "승인된 운영자를 위한 나라장터 입찰공고 리포트 내부 운영 콘솔",
  robots: {
    index: false,
    follow: false,
  },
};

const themeScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("g2b-theme");
    document.documentElement.dataset.theme = stored === "light" ? "light" : "dracula";
  } catch {
    document.documentElement.dataset.theme = "dracula";
  }
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  ensureSchedulerStarted();

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-theme="dracula"
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
