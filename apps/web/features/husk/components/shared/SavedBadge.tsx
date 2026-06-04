export function SavedBadge({ isVisible }: { isVisible: boolean }) {
  return isVisible ? (
    <span className="husk-school__saved" role="status">
      Lagret
    </span>
  ) : null;
}
