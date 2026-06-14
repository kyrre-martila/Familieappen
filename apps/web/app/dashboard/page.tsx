"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bug, MessageSquare } from "lucide-react";

import packageJson from "../../package.json";
import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Badge, Card, EmptyState, PageContainer, SectionHeader } from "../../components/ui";
import { CalendarDayChips } from "../../features/calendar/components/CalendarDayChips";
import { CalendarDayView } from "../../features/calendar/components/CalendarDayView";
import { CalendarProvider, useCalendar } from "../../features/calendar/hooks/useCalendar";
import { getCurrentUserProfile, getShoppingList, type ShoppingList, type UserProfile } from "../../lib/api";
import { FeedbackSheet } from "../settings/about/AppInfoSettingsClient";

type FeedbackType = "feedback" | "bug";

const appVersion = typeof packageJson.version === "string" && packageJson.version.trim() ? packageJson.version : "0.1.0";

function HomeContent() {
  const familyAccess = useFamilyAccess();
  const { error, loading, refresh, today } = useCalendar();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [shoppingLoading, setShoppingLoading] = useState(true);
  const [sheet, setSheet] = useState<FeedbackType | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const activeFamilyId = familyAccess.status === "approved" ? familyAccess.familyContext.activeFamilyId : null;

  useEffect(() => {
    let cancelled = false;
    getCurrentUserProfile()
      .then((userProfile) => {
        if (!cancelled) setProfile(userProfile);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeFamilyId) {
      setShoppingList(null);
      setShoppingLoading(false);
      return;
    }

    let cancelled = false;
    setShoppingLoading(true);
    getShoppingList(activeFamilyId)
      .then((list) => {
        if (!cancelled) setShoppingList(list);
      })
      .catch(() => {
        if (!cancelled) setShoppingList(null);
      })
      .finally(() => {
        if (!cancelled) setShoppingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFamilyId]);

  const uncheckedItems = useMemo(
    () => shoppingList?.items.filter((item) => !item.checked) ?? [],
    [shoppingList],
  );
  const visibleShoppingItems = uncheckedItems.slice(0, 4);
  const remainingShoppingCount = Math.max(0, uncheckedItems.length - visibleShoppingItems.length);

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Hjem">
        <PageContainer>
          <Card tone="default">
            <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell title="Hjem">
      <PageContainer>
        <section className="home-dashboard" aria-label="Familiens oversikt for i dag">
          <header className="home-hero">
            <span className="home-hero__logo" aria-hidden="true">
              <Image alt="" height={44} priority src="/assets/brand/familieappen-icon.svg" width={44} />
            </span>
            <div className="home-hero__copy">
              <h1>God morgen, {getFirstName(profile?.displayName)}</h1>
              <p>{formatToday(today)}</p>
            </div>
          </header>

          <CalendarDayChips selectedDate={today} />

          <Card className="home-card home-card--calendar" tone="warm">
            <div className="home-card__header-row">
              <SectionHeader eyebrow="I dag" title="Dagens kalender" />
              <Link className="button button--secondary" href="/calendar">
                Se hele dagen
              </Link>
            </div>
            {error ? (
              <EmptyState title="Kunne ikke hente kalenderen" description="Prøv igjen for å se dagens planer." />
            ) : loading ? (
              <EmptyState title="Henter dagens planer" description="Vent litt mens vi finner kalenderen." />
            ) : (
              <CalendarDayView selectedDate={today} showChips={false} />
            )}
            {error ? (
              <button className="button button--secondary" type="button" onClick={() => void refresh()}>
                Prøv igjen
              </button>
            ) : null}
          </Card>

          <Card className="home-card" tone="default">
            <div className="home-card__header-row">
              <SectionHeader eyebrow="Praktisk" title="Handleliste" action={<Badge tone="neutral">{formatShoppingCount(uncheckedItems.length)}</Badge>} />
              <Link className="button button--secondary" href="/shopping">
                Åpne handleliste
              </Link>
            </div>
            {shoppingLoading ? (
              <EmptyState title="Henter handlelisten" description="Ser etter varer familien mangler." />
            ) : visibleShoppingItems.length ? (
              <ul className="home-shopping-list" aria-label="Varer som mangler">
                {visibleShoppingItems.map((item) => (
                  <li key={item.id}>
                    <span aria-hidden="true">☐</span>
                    <span>{item.quantity ? `${item.label} · ${item.quantity}` : item.label}</span>
                  </li>
                ))}
                {remainingShoppingCount > 0 ? <li className="home-shopping-list__more">+{remainingShoppingCount} til</li> : null}
              </ul>
            ) : (
              <EmptyState title="Ingenting som mangler akkurat nå" description="Legg til varer når noe må handles." />
            )}
          </Card>

          <Card className="home-card" tone="soft">
            <SectionHeader eyebrow="Raskt videre" title="Snarveier" />
            <div className="home-shortcuts">
              <Link href="/calendar/events/new">Ny hendelse</Link>
              <Link href="/husk/reminders/new">Ny husk</Link>
              <Link href="/meals?create=1">Planlegg middag</Link>
              <Link href="/shopping">Legg til vare</Link>
            </div>
          </Card>

          <Card className="home-card home-card--beta" tone="accent">
            <SectionHeader eyebrow="Hjelp" title="Hjelp oss gjøre FamilieAppen bedre" action={<Badge tone="primary">BETA</Badge>} />
            <div className="home-feedback-actions">
              <button type="button" className="button button--secondary" onClick={() => { setFeedbackMessage(""); setSheet("feedback"); }}>
                <MessageSquare aria-hidden="true" size={18} /> Send tilbakemelding
              </button>
              <button type="button" className="button button--secondary" onClick={() => { setFeedbackMessage(""); setSheet("bug"); }}>
                <Bug aria-hidden="true" size={18} /> Rapporter feil
              </button>
            </div>
            {feedbackMessage ? <p className="home-feedback-success" role="status">{feedbackMessage}</p> : null}
          </Card>
        </section>
      </PageContainer>
      {sheet ? <FeedbackSheet type={sheet} version={appVersion} onCancel={() => setSheet(null)} onSent={(message) => { setSheet(null); setFeedbackMessage(message); }} /> : null}
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <CalendarProvider>
      <HomeContent />
    </CalendarProvider>
  );
}

function getFirstName(displayName?: string) {
  return displayName?.trim().split(/\s+/)[0] || "familien";
}

function formatToday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
}

function formatShoppingCount(count: number) {
  return `${count} ${count === 1 ? "vare" : "varer"} mangler`;
}
