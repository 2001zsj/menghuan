"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { Container, Drawer, IconButton, MenuIcon } from "@menghuan/ui";
import { ThemeControl, TimezoneControl } from "./preference-controls";

const navItems = [
  ["/", "首页"],
  ["/today", "今日更新"],
  ["/schedule", "放送表"],
  ["/season", "新番"],
  ["/library", "资料库"],
  ["/favorites", "收藏"],
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="主要导航">
      <ul className="site-nav__list">
        {navItems.map(([href, label]) => {
          const active = href === "/" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                {...(onNavigate ? { onClick: onNavigate } : {})}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-header">
        <Container className="site-header__inner">
          <Link className="brand" href="/">
            <span aria-hidden="true">◇</span>
            <span>
              <strong>梦幻</strong>
              <small>梦境档案馆 · Stage 4</small>
            </span>
          </Link>
          <div className="desktop-nav">
            <NavLinks />
          </div>
          <div className="desktop-preferences">
            <TimezoneControl />
            <ThemeControl />
          </div>
          <div className="mobile-menu">
            <IconButton
              label="打开导航菜单"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          </div>
        </Container>
      </header>
      <main id="main-content" className="site-main">
        {children}
      </main>
      <footer className="site-footer">
        <Container>
          <p>
            梦幻 · Stage 4受控Fixture演示。所有作品与人物均为完全虚构内容，演示日期不代表现实当天。
          </p>
        </Container>
      </footer>
      <Drawer open={open} title="梦幻导航" onClose={close}>
        <div id="mobile-navigation" className="mobile-navigation">
          <NavLinks onNavigate={close} />
          <div className="mobile-preferences">
            <span>展示时区</span>
            <TimezoneControl />
            <span>主题</span>
            <ThemeControl />
          </div>
        </div>
      </Drawer>
    </>
  );
}
