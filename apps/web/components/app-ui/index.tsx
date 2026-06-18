"use client";

import { useEffect, useState, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
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
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  isOpen: boolean;
  labelledBy: string;
  onClose: () => void;
  portal?: boolean;
}

export function AppSheet({
  actions,
  children,
  className,
  contentClassName,
  isOpen,
  labelledBy,
  onClose,
  portal = true,
}: AppSheetProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const sheet = (
    <div aria-hidden={!isOpen} className={cx("app-sheet", isOpen && "app-sheet--open")}>
      <button className="app-sheet__backdrop" type="button" aria-label="Lukk" onClick={onClose} />
      <section aria-labelledby={labelledBy} aria-modal="true" className={cx("app-sheet__panel", className)} role="dialog">
        <div className="app-sheet__handle" aria-hidden="true" />
        <div className={cx("app-sheet__content", contentClassName)}>{children}</div>
        {actions ? <AppActionFooter>{actions}</AppActionFooter> : null}
      </section>
    </div>
  );

  return portal && isMounted ? createPortal(sheet, document.body) : sheet;
}

export function AppField({ children, className, ...props }: ComponentPropsWithoutRef<"label">) {
  return (
    <label className={cx("app-field", className)} {...props}>
      {children}
    </label>
  );
}

export function AppTextarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return <textarea className={cx("app-textarea", className)} {...props} />;
}

export function AppSelect({ className, children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select className={cx("app-select", className)} {...props}>
      {children}
    </select>
  );
}

export function AppActionFooter({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cx("app-action-footer", className)} {...props}>
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

interface AppSectionHeaderProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  action?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}

export function AppSectionHeader({ action, className, eyebrow, title, ...props }: AppSectionHeaderProps) {
  return (
    <div className={cx("app-section-header", className)} {...props}>
      <div>
        {eyebrow ? <p className="app-section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="app-section-header__title">{title}</h2>
      </div>
      {action ? <div className="app-section-header__action">{action}</div> : null}
    </div>
  );
}

export function AppMenuButton({ className, type = "button", ...props }: ComponentPropsWithoutRef<"button">) {
  return <button className={cx("app-menu-button", className)} type={type} {...props} />;
}

interface AppEmptyStateProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  action?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}

export function AppEmptyState({ action, className, description, icon, title, ...props }: AppEmptyStateProps) {
  return (
    <div className={cx("app-empty-state", className)} {...props}>
      {icon ? <div className="app-empty-state__icon" aria-hidden="true">{icon}</div> : null}
      <div className="app-empty-state__copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action ? <div className="app-empty-state__action">{action}</div> : null}
    </div>
  );
}
