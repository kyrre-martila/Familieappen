"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, PageContainer, SectionHeader } from "../../components/ui";
import {
  ApiError,
  FamilyDashboardResponse,
  FamilyWithMembership,
  clearActiveFamilyId,
  clearAuthSession,
  getAccessToken,
  getActiveFamilyId,
  getFamilyDashboard,
  listFamilies,
  setActiveFamilyId
} from "../../lib/api";

type DashboardStatus = "loading" | "ready" | "unauthorized" | "no-family" | "error";

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<FamilyDashboardResponse | null>(null);
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [message, setMessage] = useState("Loading your family dashboard…");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    void loadDashboard();
  }, [router]);

  async function loadDashboard(preferredFamilyId?: string) {
    setStatus("loading");
    setMessage("Loading your family dashboard…");

    try {
      const userFamilies = await listFamilies();
      setFamilies(userFamilies);

      if (userFamilies.length === 0) {
        clearActiveFamilyId();
        setDashboard(null);
        setActiveFamilyIdState(null);
        setStatus("no-family");
        setMessage("Create a family to start using the dashboard.");
        router.replace("/onboarding/create-family");
        return;
      }

      const storedFamilyId = preferredFamilyId ?? getActiveFamilyId();
      const storedFamily = userFamilies.find((family) => family.family.id === storedFamilyId);
      const nextFamilyId = storedFamily?.family.id ?? userFamilies[0].family.id;

      setActiveFamilyId(nextFamilyId);
      setActiveFamilyIdState(nextFamilyId);

      const dashboardData = await getFamilyDashboard(nextFamilyId);
      setDashboard(dashboardData);
      setStatus("ready");
      setMessage("Family dashboard ready.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthSession();
        setDashboard(null);
        setStatus("unauthorized");
        setMessage("Your session has expired. Please sign in again.");
        router.replace("/login");
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
    setActiveFamilyId(familyId);
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
          <EmptyState
            title="No events today"
            description="Enjoy the breathing room. Calendar plans will appear here when the calendar module is connected."
          />
        </Card>

        <Card className="dashboard-card" tone="soft">
          <SectionHeader action={<Badge tone="neutral">Empty</Badge>} eyebrow="Dinner" title="What is for dinner?" />
          <EmptyState
            title="No dinner planned today"
            description="Dinner plans will show here once meal planning is added."
          />
        </Card>

        <Card className="dashboard-card" tone="default">
          <SectionHeader
            action={<Badge tone="neutral">{dashboard?.shoppingSummary.uncheckedCount ?? 0} left</Badge>}
            eyebrow="Shopping"
            title="What needs to be bought?"
          />
          <EmptyState
            title="Shopping list is empty"
            description="Unchecked shopping items will appear here when shopping lists are connected."
          />
        </Card>

        <Card className="dashboard-card" tone="default">
          <SectionHeader
            action={<Badge tone="neutral">{dashboard?.todayTasks.length ?? 0} tasks</Badge>}
            eyebrow="Tasks"
            title="What needs to be done?"
          />
          <EmptyState
            title="No tasks due today"
            description="Assigned family tasks will appear here when task planning is connected."
          />
        </Card>

        <Card className="dashboard-card dashboard-card--wishlist" tone="accent">
          <SectionHeader
            action={<Badge tone="neutral">{dashboard?.wishlistSummary.upcomingBirthdays.length ?? 0} birthdays</Badge>}
            eyebrow="Wishlists"
            title="Upcoming birthdays"
          />
          <EmptyState
            title="No wishlist reminders yet"
            description="Birthdays and gift reminders will appear here when wishlists are connected."
          />
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
