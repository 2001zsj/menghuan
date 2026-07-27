"use client";

import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from "react";

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={cx("mh-button", `mh-button--${variant}`, className)} {...props} />;
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ className, label, children, ...props }: IconButtonProps) {
  return (
    <button className={cx("mh-icon-button", className)} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path
        d="M12 20.2 4.7 13A4.8 4.8 0 0 1 11.5 6l.5.6.5-.6a4.8 4.8 0 0 1 6.8 6.9Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
  className?: string;
}) {
  return <span className={cx("mh-badge", `mh-badge--${tone}`, className)}>{children}</span>;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("mh-card", className)} {...props} />;
}

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("mh-container", className)} {...props} />;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mh-section-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="mh-section-header__action">{action}</div> : null}
    </div>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<ChoiceOption<T>>;
  onChange: (value: T) => void;
  testId?: string;
}) {
  return (
    <fieldset className="mh-segmented" data-testid={testId}>
      <legend className="mh-visually-hidden">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

export function Tabs<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<ChoiceOption<T>>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mh-tabs">
      <legend className="mh-visually-hidden">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

export function Select({
  label,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <label className={cx("mh-field", className)} htmlFor={id}>
      <span>{label}</span>
      <select id={id} {...props}>
        {children}
      </select>
    </label>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="mh-empty-state">
      <span className="mh-empty-state__mark" aria-hidden="true">
        ◇
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </Card>
  );
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  label = "内容加载中",
}: {
  width?: string;
  height?: string;
  label?: string;
}) {
  return (
    <span className="mh-skeleton" style={{ width, height }} role="status" aria-label={label} />
  );
}

export function PosterPlaceholder({
  title,
  compact = false,
}: {
  title: string;
  compact?: boolean;
}) {
  const initials = Array.from(title).slice(0, 2).join("");
  return (
    <div
      className={cx("mh-poster", compact && "mh-poster--compact")}
      role="img"
      aria-label={`${title}的抽象占位海报`}
    >
      <span className="mh-poster__orb" aria-hidden="true" />
      <span className="mh-poster__initials" aria-hidden="true">
        {initials}
      </span>
      <span className="mh-poster__caption">MOCK ARCHIVE</span>
    </div>
  );
}

const DRAWER_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getDrawerFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0,
  );
}

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusFirstElement = () => {
      const drawer = drawerRef.current;
      if (!drawer) return;
      const firstElement = getDrawerFocusableElements(drawer)[0];
      (firstElement ?? drawer).focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      const drawer = drawerRef.current;
      if (drawer && event.target instanceof Node && !drawer.contains(event.target)) {
        focusFirstElement();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusableElements = getDrawerFocusableElements(drawer);
      if (focusableElements.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstElement || !drawer.contains(activeElement))) {
        event.preventDefault();
        lastElement?.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === lastElement || !drawer.contains(activeElement))
      ) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mh-drawer-layer">
      <button
        className="mh-drawer-backdrop"
        type="button"
        tabIndex={-1}
        aria-label="关闭菜单"
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        className="mh-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="mh-drawer__header">
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeRef}
            className="mh-icon-button"
            type="button"
            aria-label="关闭菜单"
            title="关闭菜单"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function AnimeCard({
  title,
  alias,
  href,
  status,
  format,
  tags,
  isFavorite,
  onFavoriteToggle,
}: {
  title: string;
  alias?: string;
  href: string;
  status: string;
  format: string;
  tags: string[];
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
}) {
  return (
    <article className="mh-anime-card">
      <a className="mh-anime-card__poster-link" href={href} aria-label={`查看${title}详情`}>
        <PosterPlaceholder title={title} />
      </a>
      <div className="mh-anime-card__body">
        <div className="mh-anime-card__meta">
          <Badge tone="accent">Mock</Badge>
          <Badge>{format}</Badge>
          <Badge tone="success">{status}</Badge>
        </div>
        <h3>
          <a href={href}>{title}</a>
        </h3>
        {alias ? <p className="mh-anime-card__alias">{alias}</p> : null}
        <ul className="mh-tag-list" aria-label="标签">
          {tags.slice(0, 3).map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
        {onFavoriteToggle ? (
          <FavoriteButton active={Boolean(isFavorite)} onClick={onFavoriteToggle} />
        ) : null}
      </div>
    </article>
  );
}

export function BroadcastItem({
  title,
  href,
  convertedTime,
  originalTime,
  status,
  testId,
}: {
  title: string;
  href: string;
  convertedTime: string;
  originalTime: string;
  status: string;
  testId?: string;
}) {
  return (
    <article className="mh-broadcast-item" data-testid={testId}>
      <div>
        <Badge tone={status === "时间待定" ? "warning" : "accent"}>{status}</Badge>
        <h3>
          <a href={href}>{title}</a>
        </h3>
      </div>
      <div className="mh-broadcast-item__times">
        <strong>{convertedTime}</strong>
        <span>原始：{originalTime}</span>
      </div>
    </article>
  );
}

export function FavoriteButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "primary"}
      aria-pressed={active}
      onClick={onClick}
    >
      <HeartIcon filled={active} /> {active ? "取消收藏" : "收藏"}
    </Button>
  );
}
