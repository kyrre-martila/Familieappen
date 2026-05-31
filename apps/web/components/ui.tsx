import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  tone?: "default" | "dashboard" | "auth" | "welcome";
}

export function PageContainer({ children, tone = "default" }: PageContainerProps) {
  const classes = ["page-container", tone !== "default" ? `page-container--${tone}` : ""].filter(Boolean).join(" ");

  return <div className={classes}>{children}</div>;
}

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: "default" | "warm" | "soft" | "accent";
}

export function Card({ children, className, tone = "default" }: CardProps) {
  const classes = ["card", `card--${tone}`, className].filter(Boolean).join(" ");

  return <article className={classes}>{children}</article>;
}

interface SectionHeaderProps {
  action?: ReactNode;
  eyebrow?: string;
  title: string;
}

export function SectionHeader({ action, eyebrow, title }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="section-header__title">{title}</h2>
      </div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
}

interface EmptyStateProps {
  description: string;
  title: string;
}

export function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__description">{description}</p>
    </div>
  );
}

export function LoadingState({ description, title = "Loading" }: Partial<EmptyStateProps> & Pick<EmptyStateProps, "description">) {
  return <EmptyState title={title} description={description} />;
}

export function ErrorState({ description, title = "Something went wrong" }: Partial<EmptyStateProps> & Pick<EmptyStateProps, "description">) {
  return <EmptyState title={title} description={description} />;
}

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "primary" | "accent" | "success" | "warning";
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ children, className, type = "button", variant = "secondary", ...props }: ButtonProps) {
  const classes = ["button", `button--${variant}`, className].filter(Boolean).join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
