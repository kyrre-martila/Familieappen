interface PlaceholderCardProps {
  body: string;
  label: string;
  title: string;
}

export function PlaceholderCard({ body, label, title }: PlaceholderCardProps) {
  return (
    <article className="placeholder-card">
      <p className="placeholder-card__label">{label}</p>
      <h2 className="placeholder-card__title">{title}</h2>
      <p className="placeholder-card__body">{body}</p>
    </article>
  );
}
