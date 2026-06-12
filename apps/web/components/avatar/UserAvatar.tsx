import { getDisplayName, getInitials, type IdentitySource } from "../../lib/identity";

type UserAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type UserAvatarProps = {
  identity: IdentitySource;
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  className?: string;
  decorative?: boolean;
};

function getApiAssetUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ?? "";

  if (path.startsWith("/")) {
    return `${apiBaseUrl}${path}`;
  }

  return path;
}

export function UserAvatar({ identity, avatarUrl, size = "md", className = "", decorative = false }: UserAvatarProps) {
  const displayName = getDisplayName(identity);
  const initials = getInitials(identity);
  const classNames = ["user-avatar", `user-avatar--${size}`, className].filter(Boolean).join(" ");
  const resolvedAvatarUrl = avatarUrl ? getApiAssetUrl(avatarUrl) : null;

  return (
    <span className={classNames} aria-hidden={decorative ? "true" : undefined} aria-label={decorative ? undefined : displayName} title={displayName}>
      {resolvedAvatarUrl ? <img alt="" className="user-avatar__image" src={resolvedAvatarUrl} /> : <span className="user-avatar__initials">{initials}</span>}
    </span>
  );
}