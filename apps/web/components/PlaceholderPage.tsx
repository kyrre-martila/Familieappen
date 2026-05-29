import { PageHeader } from "./PageHeader";
import { PlaceholderCard } from "./PlaceholderCard";

interface PlaceholderPageProps {
  description: string;
  label: string;
  title: string;
}

export function PlaceholderPage({ description, label, title }: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <PageHeader description={description} title={title} />
      <PlaceholderCard
        body="This section is a static shell for now. Real data and feature logic will come after the first web product shape is validated."
        label={label}
        title={`${title} placeholder`}
      />
    </section>
  );
}
