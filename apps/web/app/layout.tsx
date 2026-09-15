import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@menghuan/ui/styles.css";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: { default: "梦幻 · 梦境档案馆", template: "%s · 梦幻" },
  description: "梦幻Stage 4受控Fixture发现流程：今日更新、每周放送与季度新番。",
};

const themeBootScript = `(() => { try { const raw = localStorage.getItem('menghuan:ui-preferences:v1'); const value = raw ? JSON.parse(raw) : null; const theme = value && ['system','light','dark'].includes(value.theme) ? value.theme : 'system'; document.documentElement.dataset.theme = theme; } catch { document.documentElement.dataset.theme = 'system'; } })();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="system" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <AppProviders>
          <SiteShell>{children}</SiteShell>
        </AppProviders>
      </body>
    </html>
  );
}
