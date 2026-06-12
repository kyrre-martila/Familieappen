import { getDisplayName, getInitials, type IdentitySource } from "../../lib/identity";

type UserAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type UserAvatarProps = {
  identity: IdentitySource;
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  className?: string;
  decorative?: boolean;
};

export function UserAvatar({ identity, avatarUrl, size = "md", className = "", decorative = false }: UserAvatarProps) {
  const displayName = getDisplayName(identity);
  const initials = getInitials(identity);
  const classNames = ["user-avatar", `user-avatar--${size}`, className].filter(Boolean).join(" ");

  return (
    <span className={classNames} aria-hidden={decorative ? "true" : undefined} aria-label={decorative ? undefined : displayName} title={displayName}>
      {avatarUrl ? <img alt="" className="user-avatar__image" src={avatarUrl} /> : <span className="user-avatar__initials">{initials}</span>}
    </span>
  );
}
