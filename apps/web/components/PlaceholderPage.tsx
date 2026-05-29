import { PageHeader } from "./PageHeader";
import { Card, EmptyState, PageContainer } from "./ui";

interface PlaceholderPageProps {
  description: string;
  label: string;
  title: string;
}

export function PlaceholderPage({ description, label, title }: PlaceholderPageProps) {
  return (
    <PageContainer>
      <PageHeader description={description} title={title} />
      <Card>
        <EmptyState
          description="This section is a static shell for now. Real data and feature logic will come after the first web product shape is validated."
          title={`${label} foundation`}
        />
      </Card>
    </PageContainer>
  );
}
