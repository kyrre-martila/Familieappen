import { PageHeader } from "../components/PageHeader";
import { PlaceholderCard } from "../components/PlaceholderCard";

const dashboardCards = [
  {
    label: "Calendar",
    title: "Today’s events",
    body: "A quick overview of appointments, school activities and family plans will live here."
  },
  {
    label: "Meals",
    title: "Dinner today",
    body: "Show the planned dinner, notes and who is cooking when meal planning is added."
  },
  {
    label: "Shopping",
    title: "Shopping list",
    body: "Surface the most important grocery items and household errands for the next shop."
  },
  {
    label: "Tasks",
    title: "Tasks",
    body: "Highlight shared chores, reminders and small jobs that need family attention."
  },
  {
    label: "Wishlists",
    title: "Wishlists",
    body: "Keep birthdays, holidays and gift ideas easy to find when wishlist logic arrives."
  }
];

export default function HomePage() {
  return (
    <>
      <PageHeader
        description="A calm starting point for family logistics across calendar, dinner, shopping, tasks and wishlists."
        eyebrow="Dashboard"
        title="Today at a glance"
      />
      <section aria-label="Dashboard placeholders" className="card-grid">
        {dashboardCards.map((card) => (
          <PlaceholderCard body={card.body} key={card.title} label={card.label} title={card.title} />
        ))}
      </section>
    </>
  );
}
