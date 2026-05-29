interface PageHeaderProps {
  description: string;
  eyebrow?: string;
  title: string;
}

export function PageHeader({ description, eyebrow = "FamilieAppen", title }: PageHeaderProps) {
  return (
    <header className="page-header">
      <p className="page-header__eyebrow">{eyebrow}</p>
      <h1 className="page-header__title">{title}</h1>
      <p className="page-header__description">{description}</p>
    </header>
  );
}
