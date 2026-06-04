export function SectionHeader({
  count,
  countClassName = "",
  countLabel,
  id,
  title,
}: {
  count: number;
  countClassName?: string;
  countLabel: string;
  id: string;
  title: string;
}) {
  return (
    <div className="husk-reminder-group__heading">
      <h2 className="husk-reminder-group__title" id={id}>
        {title}
      </h2>
      <span
        className={`husk-reminder-group__count${countClassName ? ` ${countClassName}` : ""}`}
        aria-label={countLabel}
      >
        {count}
      </span>
    </div>
  );
}
