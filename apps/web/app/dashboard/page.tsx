import { Badge, Button, Card, EmptyState, PageContainer, SectionHeader } from "../../components/ui";

const todayEvents = [
  { time: "08:15", title: "School drop-off", detail: "Maja and Sofie" },
  { time: "16:30", title: "Piano lesson", detail: "Max" },
  { time: "18:00", title: "Football practice", detail: "Sofie" }
];

const upcomingActivities = ["Class trip form due tomorrow", "Dentist on Thursday", "Grandma visits Saturday"];
const mealOverview = ["Mon · Salmon bowls", "Tue · Pasta with pesto", "Wed · Leftover night"];
const shoppingItems = ["Milk", "Bread", "Bananas", "Toothpaste"];
const tasks = [
  { title: "Pack gym bag", owner: "Sofie", state: "Today" },
  { title: "Water balcony plants", owner: "Pappa", state: "After dinner" },
  { title: "Return library books", owner: "Maja", state: "Tomorrow" }
];

export default function HomePage() {
  return (
    <PageContainer tone="dashboard">
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="dashboard-hero__copy">
          <Badge tone="primary">Friday overview</Badge>
          <h1 id="dashboard-title" className="dashboard-hero__title">
            Good morning, Jenny ☀️
          </h1>
          <p className="dashboard-hero__description">
            A calm overview of today’s plans, dinner, shopping and shared family tasks.
          </p>
        </div>
        <div className="dashboard-hero__actions" aria-label="Quick actions">
          <Button variant="secondary">View calendar</Button>
          <Button variant="primary">Add plan</Button>
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Family dashboard">
        <Card className="dashboard-card dashboard-card--today" tone="warm">
          <SectionHeader
            action={<Badge tone="accent">3 events</Badge>}
            eyebrow="Today"
            title="What happens today?"
          />
          <div className="timeline" aria-label="Today's events">
            {todayEvents.map((event) => (
              <div className="timeline__item" key={`${event.time}-${event.title}`}>
                <time className="timeline__time">{event.time}</time>
                <div>
                  <p className="timeline__title">{event.title}</p>
                  <p className="timeline__detail">{event.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mini-list" aria-label="Upcoming activities">
            <p className="mini-list__label">Upcoming activities</p>
            {upcomingActivities.map((activity) => (
              <p className="mini-list__item" key={activity}>
                {activity}
              </p>
            ))}
          </div>
        </Card>

        <Card className="dashboard-card" tone="soft">
          <SectionHeader action={<Badge tone="success">Planned</Badge>} eyebrow="Dinner" title="What is for dinner?" />
          <div className="dinner-card">
            <p className="dinner-card__label">Dinner today</p>
            <p className="dinner-card__meal">Taco bowls with avocado</p>
            <p className="dinner-card__note">Prep vegetables before football practice.</p>
          </div>
          <div className="compact-stack" aria-label="Quick meal overview">
            {mealOverview.map((meal) => (
              <span className="compact-row" key={meal}>
                {meal}
              </span>
            ))}
          </div>
        </Card>

        <Card className="dashboard-card" tone="default">
          <SectionHeader action={<Badge tone="warning">7 left</Badge>} eyebrow="Shopping" title="What needs to be bought?" />
          <div className="status-meter" aria-label="Shopping list status">
            <span className="status-meter__bar" />
          </div>
          <p className="card-note">5 of 12 items checked before the next grocery trip.</p>
          <div className="check-list" aria-label="Shopping list preview">
            {shoppingItems.map((item, index) => (
              <span className="check-list__item" key={item}>
                <span aria-hidden="true" className={index < 2 ? "check-list__box check-list__box--done" : "check-list__box"} />
                {item}
              </span>
            ))}
          </div>
        </Card>

        <Card className="dashboard-card" tone="default">
          <SectionHeader action={<Badge tone="primary">2 assigned</Badge>} eyebrow="Tasks" title="What needs to be done?" />
          <div className="task-list" aria-label="Tasks today">
            {tasks.map((task) => (
              <div className="task-list__item" key={task.title}>
                <div>
                  <p className="task-list__title">{task.title}</p>
                  <p className="task-list__owner">{task.owner}</p>
                </div>
                <Badge tone={task.state === "Tomorrow" ? "neutral" : "accent"}>{task.state}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="dashboard-card dashboard-card--wishlist" tone="accent">
          <SectionHeader eyebrow="Wishlists" title="Upcoming birthdays" />
          <div className="birthday-list" aria-label="Upcoming birthdays">
            <div>
              <p className="birthday-list__date">June 8</p>
              <p className="birthday-list__name">Emma turns 9</p>
            </div>
            <div>
              <p className="birthday-list__date">June 21</p>
              <p className="birthday-list__name">Grandpa’s birthday</p>
            </div>
          </div>
          <EmptyState
            title="Wishlist reminders coming later"
            description="A gentle placeholder for gift ideas, birthdays and seasonal wishes."
          />
        </Card>
      </section>
    </PageContainer>
  );
}
