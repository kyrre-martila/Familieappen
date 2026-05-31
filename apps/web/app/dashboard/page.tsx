"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, PageContainer, SectionHeader } from "../../components/ui";
import { ApiError, FamilyDashboardResponse, FamilyWithMembership, getFamilyDashboard } from "../../lib/api";
import { chooseActiveFamily, getUserFacingApiMessage, handleMissingOrInvalidAuth, loadAvailableFamilies, requireAuth } from "../../lib/auth-family";
import { clearActiveFamilyId } from "../../lib/session";

type DashboardStatus = "loading" | "ready" | "unauthorized" | "no-family" | "error";

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<FamilyDashboardResponse | null>(null);
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [message, setMessage] = useState("Loading your family dashboard…");

  useEffect(() => {
    if (!requireAuth(router)) {
      return;
    }

    void loadDashboard();
  }, [router]);

  async function loadDashboard(preferredFamilyId?: string) {
    setStatus("loading");
    setMessage("Loading your family dashboard…");

    try {
      const familyContext = await loadAvailableFamilies(preferredFamilyId);

      if (familyContext.status === "unauthenticated") {
        router.replace("/login");
        return;
      }

      if (familyContext.status === "no-family") {
        setFamilies([]);
        setDashboard(null);
        setActiveFamilyIdState(null);
        setStatus("no-family");
        setMessage("Create a family to start using the dashboard.");
        router.replace("/onboarding/create-family");
        return;
      }

      setFamilies(familyContext.families);
      setActiveFamilyIdState(familyContext.activeFamilyId);
      const nextFamilyId = familyContext.activeFamilyId;

      const dashboardData = await getFamilyDashboard(nextFamilyId);
      setDashboard(dashboardData);
      setStatus("ready");
      setMessage("Family dashboard ready.");
    } catch (error) {
      if (handleMissingOrInvalidAuth(error, router)) {
        setDashboard(null);
        setStatus("unauthorized");
        setMessage(getUserFacingApiMessage(error, "Your session has expired. Please sign in again."));
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        clearActiveFamilyId();
        setDashboard(null);
        setActiveFamilyIdState(null);
        setStatus("error");
        setMessage("That family could not be loaded for your account. Please choose another family.");
        return;
      }

      setDashboard(null);
      setStatus("error");
      setMessage("Could not load the dashboard right now. Please try again.");
    }
  }

  async function handleFamilyChange(event: ChangeEvent<HTMLSelectElement>) {
    const familyId = event.target.value;
    chooseActiveFamily(familyId);
    setActiveFamilyIdState(familyId);
    await loadDashboard(familyId);
  }

  const familyName = dashboard?.family.name ?? "Your family";
  const memberCount = dashboard?.members.length ?? 0;
  const isLoading = status === "loading";
  const hasMultipleFamilies = families.length > 1;

  return (
    <PageContainer tone="dashboard">
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="dashboard-hero__copy">
          <Badge tone="primary">Family overview</Badge>
          <h1 id="dashboard-title" className="dashboard-hero__title">
            {isLoading ? "Loading dashboard…" : familyName}
          </h1>
          <p className="dashboard-hero__description">
            {dashboard
              ? `A calm overview for ${familyName}, with ${memberCount} family member${memberCount === 1 ? "" : "s"} set up.`
              : message}
          </p>
        </div>
        <div className="dashboard-hero__actions" aria-label="Dashboard actions">
          {hasMultipleFamilies ? (
            <label className="family-switcher">
              <span className="family-switcher__label">Active family</span>
              <select className="family-switcher__select" value={activeFamilyId ?? ""} onChange={handleFamilyChange}>
                {families.map((family) => (
                  <option key={family.family.id} value={family.family.id}>
                    {family.family.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Link className="button button--secondary" href="/calendar">
            View calendar
          </Link>
          <Link className="button button--primary" href="/onboarding/add-members">
            Add member
          </Link>
        </div>
      </section>

      {status !== "ready" ? <DashboardStatusCard status={status} message={message} onRetry={() => loadDashboard()} /> : null}

      <section className="dashboard-grid" aria-label="Family dashboard" aria-busy={isLoading}>
        <Card className="dashboard-card" tone="warm">
          <SectionHeader
            action={<Badge tone="primary">{memberCount} members</Badge>}
            eyebrow="Family"
            title="Who is on the overview?"
          />
          {dashboard ? (
            <ul className="member-list" aria-label="Dashboard family members">
              {dashboard.members.map((member) => (
                <li className="member-list__item" key={member.id}>
                  <span className="member-list__name">{member.displayName}</span>
                  <span className="member-list__role">{formatRole(member.role)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No family loaded yet" description={message} />
          )}
        </Card>

        <Card className="dashboard-card dashboard-card--today" tone="warm">
          <SectionHeader
            action={<Badge tone="neutral">{dashboard?.todayEvents.length ?? 0} events</Badge>}
            eyebrow="Today"
            title="What happens today?"
          />
          {dashboard?.todayEvents.length ? (
            <ul className="timeline" aria-label="Today events">
              {dashboard.todayEvents.map((event) => (
                <li className="timeline__item" key={event.id}>
                  <span className="timeline__time">{formatEventTime(event)}</span>
                  <div>
                    <p className="timeline__title">{event.title}</p>
                    <p className="timeline__detail">{formatEventParticipants(event)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No events today" description="No events today. Add family plans on the calendar when something comes up." />
          )}
        </Card>

        <Card className="dashboard-card" tone="soft">
          <SectionHeader
            action={<Badge tone={dashboard?.dinnerToday ? "success" : "neutral"}>{dashboard?.dinnerToday ? "Planned" : "Empty"}</Badge>}
            eyebrow="Dinner"
            title="What is for dinner?"
          />
          {dashboard?.dinnerToday ? (
            <div className="dinner-today">
              <p className="dinner-today__label">Dinner today:</p>
              <p className="dinner-today__meal">{formatDinner(dashboard.dinnerToday.mealName)}</p>
              {dashboard.dinnerToday.notes ? <p className="dinner-today__notes">{dashboard.dinnerToday.notes}</p> : null}
            </div>
          ) : (
            <EmptyState title="No dinner planned today" description="Open meals to add a simple dinner plan for today." />
          )}
          <Link className="button button--secondary" href="/meals">
            Open meals
          </Link>
        </Card>

        <Card className="dashboard-card" tone="default">
          <SectionHeader
            action={<Badge tone="neutral">{dashboard?.shoppingSummary.totalItems ?? 0} items</Badge>}
            eyebrow="Shopping"
            title={formatShoppingSummary(dashboard?.shoppingSummary.uncheckedCount ?? 0)}
          />
          <EmptyState
            title={dashboard?.shoppingSummary.totalItems ? "Shopping list in progress" : "Shopping list is empty"}
            description={
              dashboard?.shoppingSummary.totalItems
                ? "Open shopping to add, check off, or remove shared family items."
                : "Nothing to buy right now."
            }
          />
          <Link className="button button--secondary" href="/shopping">
            Open shopping
          </Link>
        </Card>

        <Card className="dashboard-card" tone="default">
          <SectionHeader
            action={<Badge tone="neutral">{dashboard?.todayTasks.length ?? 0} tasks</Badge>}
            eyebrow="Tasks"
            title="What needs to be done?"
          />
          {dashboard?.todayTasks.length ? (
            <ul className="task-list" aria-label="Today tasks">
              {dashboard.todayTasks.map((task) => (
                <li className={task.completed ? "task-list__item task-list__item--completed" : "task-list__item"} key={task.id}>
                  <span className="task-list__status" aria-hidden="true">
                    {task.completed ? "☑" : "☐"}
                  </span>
                  <div className="task-list__content">
                    <p className="task-list__title">{task.title}</p>
                    <p className="task-list__owner">{formatTaskAssignee(task.assignedFamilyMemberId, dashboard.members)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No tasks today" description="Add quick family tasks when someone needs to remember something." />
          )}
          <Link className="button button--secondary" href="/tasks">
            Open tasks
          </Link>
        </Card>

        <Card className="dashboard-card dashboard-card--wishlist" tone="accent">
          <SectionHeader
            action={<Badge tone="neutral">{dashboard?.wishlistSummary.wishlistCount ?? 0} lists</Badge>}
            eyebrow="Wishlists"
            title="Gift ideas"
          />
          {dashboard?.wishlistSummary.recentlyUpdated.length ? (
            <ul className="mini-list" aria-label="Recent wishlists">
              {dashboard.wishlistSummary.recentlyUpdated.map((wishlist) => (
                <li className="mini-list__item" key={wishlist.id}>
                  {wishlist.title} · {wishlist.unavailableCount}/{wishlist.itemCount} unavailable
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No wishlists yet"
              description="Create a wishlist to help relatives coordinate gift ideas without spoiling surprises."
            />
          )}
          <Link className="button button--secondary" href="/wishlists">
            Open wishlists
          </Link>
        </Card>
      </section>
    </PageContainer>
  );
}

function DashboardStatusCard({
  status,
  message,
  onRetry
}: {
  status: DashboardStatus;
  message: string;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return (
      <Card className="dashboard-status" tone="default">
        <EmptyState title="Loading your dashboard" description={message} />
      </Card>
    );
  }

  if (status === "unauthorized") {
    return (
      <Card className="dashboard-status" tone="default">
        <EmptyState title="Please sign in again" description={message} />
        <Link className="button button--primary" href="/login">
          Go to login
        </Link>
      </Card>
    );
  }

  if (status === "no-family") {
    return (
      <Card className="dashboard-status" tone="default">
        <EmptyState title="Create your first family" description={message} />
        <Link className="button button--primary" href="/onboarding/create-family">
          Create family
        </Link>
      </Card>
    );
  }

  return (
    <Card className="dashboard-status" tone="default">
      <EmptyState title="Dashboard could not load" description={message} />
      <Button variant="primary" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function formatTaskAssignee(assignedFamilyMemberId: string | null, members: FamilyDashboardResponse["members"]): string {
  if (!assignedFamilyMemberId) {
    return "Anyone";
  }

  return members.find((member) => member.id === assignedFamilyMemberId)?.displayName ?? "Family task";
}

function formatShoppingSummary(uncheckedCount: number): string {
  return `${uncheckedCount} item${uncheckedCount === 1 ? "" : "s"} remaining`;
}


function formatDinner(mealName: string): string {
  const lowerMealName = mealName.toLowerCase();

  if (lowerMealName.includes("taco")) {
    return `${mealName} 🌮`;
  }

  if (lowerMealName.includes("pizza")) {
    return `${mealName} 🍕`;
  }

  if (lowerMealName.includes("pasta") || lowerMealName.includes("spaghetti")) {
    return `${mealName} 🍝`;
  }

  return mealName;
}


function formatEventTime(event: FamilyDashboardResponse["todayEvents"][number]): string {
  if (event.allDay) {
    return "All day";
  }

  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(event.startsAt));
}

function formatEventParticipants(event: FamilyDashboardResponse["todayEvents"][number]): string {
  if (!event.participants.length) {
    return event.location ?? "Whole family";
  }

  const participantNames = event.participants.map((participant) => participant.familyMember.displayName).join(", ");

  return event.location ? `${participantNames} · ${event.location}` : participantNames;
}
