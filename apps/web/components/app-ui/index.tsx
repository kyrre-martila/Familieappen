"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type PolymorphicProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppCard<T extends ElementType = "article">({
  as,
  children,
  className,
  ...props
}: PolymorphicProps<T>) {
  const Component = as ?? "article";

  return (
    <Component className={cx("app-card", className)} {...props}>
      {children}
    </Component>
  );
}

interface AppSheetProps {
  actionFooterBottomNavAware?: boolean;
  actions?: ReactNode;
  backdropClassName?: string;
  baseClassName?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  handleClassName?: string;
  isOpen: boolean;
  labelledBy: string;
  onClose: () => void;
  onSubmit?: ComponentPropsWithoutRef<"form">["onSubmit"];
  openClassName?: string;
  panelAs?: "section" | "form";
  portal?: boolean;
  wrapContent?: boolean;
}

export function AppSheet({
  actionFooterBottomNavAware = false,
  actions,
  backdropClassName,
  baseClassName = "app-sheet",
  children,
  className,
  contentClassName,
  handleClassName,
  isOpen,
  labelledBy,
  onClose,
  onSubmit,
  openClassName,
  panelAs: Panel = "section",
  portal = true,
  wrapContent = true,
}: AppSheetProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const sheet = (
    <div
      aria-hidden={!isOpen}
      className={cx(
        baseClassName,
        isOpen && (openClassName ?? `${baseClassName}--open`),
      )}
    >
      <button
        className={cx(`${baseClassName}__backdrop`, backdropClassName)}
        type="button"
        aria-label="Lukk"
        onClick={onClose}
      />
      <Panel
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={cx(`${baseClassName}__panel`, className)}
        onSubmit={onSubmit}
        role="dialog"
      >
        <div
          className={cx(`${baseClassName}__handle`, handleClassName)}
          aria-hidden="true"
        />
        {wrapContent ? (
          <div className={cx("app-sheet__content", contentClassName)}>
            {children}
          </div>
        ) : (
          children
        )}
        {actions ? (
          <AppActionFooter bottomNavAware={actionFooterBottomNavAware}>
            {actions}
          </AppActionFooter>
        ) : null}
      </Panel>
    </div>
  );

  return portal && isMounted ? createPortal(sheet, document.body) : sheet;
}

interface AppTabsProps<T extends string> {
  ariaLabel: string;
  className?: string;
  onSelect: (value: T) => void;
  options: ReadonlyArray<{
    label: string;
    panelId?: string;
    tabId?: string;
    value: T;
  }>;
  selected: T;
}

export function AppTabs<T extends string>({
  ariaLabel,
  className,
  onSelect,
  options,
  selected,
}: AppTabsProps<T>) {
  return (
    <div
      className={cx("app-tabs", className)}
      role="tablist"
      aria-label={ariaLabel}
      style={{ "--app-tabs-count": options.length } as CSSProperties}
    >
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <button
            aria-controls={option.panelId}
            aria-selected={isSelected}
            className={cx(
              "app-tabs__option",
              isSelected && "app-tabs__option--selected",
            )}
            id={option.tabId}
            key={option.value}
            onClick={() => onSelect(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function AppField({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"label">) {
  return (
    <label className={cx("app-field", className)} {...props}>
      {children}
    </label>
  );
}

export function AppTextarea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  return <textarea className={cx("app-textarea", className)} {...props} />;
}

export function AppSelect({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  return (
    <select className={cx("app-select", className)} {...props}>
      {children}
    </select>
  );
}

interface AppActionFooterProps extends ComponentPropsWithoutRef<"div"> {
  bottomNavAware?: boolean;
}

export function AppActionFooter({
  bottomNavAware = false,
  children,
  className,
  ...props
}: AppActionFooterProps) {
  return (
    <div
      className={cx(
        "app-action-footer",
        bottomNavAware && "app-action-footer--bottom-nav-aware",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AppListRow<T extends ElementType = "div">({
  as,
  children,
  className,
  ...props
}: PolymorphicProps<T>) {
  const Component = as ?? "div";

  return (
    <Component className={cx("app-list-row", className)} {...props}>
      {children}
    </Component>
  );
}

interface AppSectionHeaderProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "title"
> {
  action?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}

export function AppSectionHeader({
  action,
  className,
  eyebrow,
  title,
  ...props
}: AppSectionHeaderProps) {
  return (
    <div className={cx("app-section-header", className)} {...props}>
      <div>
        {eyebrow ? (
          <p className="app-section-header__eyebrow">{eyebrow}</p>
        ) : null}
        <h2 className="app-section-header__title">{title}</h2>
      </div>
      {action ? (
        <div className="app-section-header__action">{action}</div>
      ) : null}
    </div>
  );
}

export const AppMenuButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button">
>(function AppMenuButton({ className, type = "button", ...props }, ref) {
  return (
    <button
      className={cx("app-menu-button", className)}
      ref={ref}
      type={type}
      {...props}
    />
  );
});

interface AppEmptyStateProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "title"
> {
  action?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}

export function AppEmptyState({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: AppEmptyStateProps) {
  return (
    <div className={cx("app-empty-state", className)} {...props}>
      {icon ? (
        <div className="app-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="app-empty-state__copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action ? <div className="app-empty-state__action">{action}</div> : null}
    </div>
  );
}
