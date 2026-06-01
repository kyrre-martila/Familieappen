"use client";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer } from "../../components/ui";

const weekDays = [
  { day: "MAN", date: "2", tone: "blue" },
  { day: "TIR", date: "3", tone: "green", isToday: true },
  { day: "ONS", date: "4", tone: "orange" },
  { day: "TOR", date: "5", tone: "purple" },
  { day: "FRE", date: "6", tone: "green" },
  { day: "LØR", date: "7", tone: "blue" },
  { day: "SØN", date: "8", tone: "red" }
] as const;

const todayEvents = [
  { person: "Fiona", title: "RG trening", location: "Bjørnholt Idrettshall", time: "16:30 – 18:00", icon: "🤸", tone: "green", initials: "FI" },
  { person: "Even-Olai", title: "Fotballtrening", location: "Bjørnevatn Kunstgress", time: "18:00 – 19:30", icon: "⚽", tone: "blue", initials: "EO" },
  { person: "Elisabeth", title: "Foreldremøte", location: "Fjellvik Skole, klasserom 4B", time: "19:00 – 20:30", icon: "👥", tone: "purple", initials: "EK" }
] as const;

const upcomingEvents = [
  { day: "ONS", date: "4", title: "Tannlege", subtitle: "Alma · Tannlegesenteret", time: "14:00", icon: "🦷", tone: "blue" },
  { day: "TOR", date: "5", title: "Dugnad", subtitle: "Bjørnevatn IL · Klubbhuset", time: "17:30", icon: "👥", tone: "green" },
  { day: "FRE", date: "6", title: "Taco-kveld", subtitle: "Hele familien", time: "18:00", icon: "🍽️", tone: "orange" }
] as const;

export default function CalendarPage() {
  const familyAccess = useFamilyAccess();

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Kalender">
        <PageContainer>
          <Card tone="default">
            <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell title="Kalender">
      <PageContainer>
        <section className="calendar-week" aria-label="Ukeoversikt">
          <div className="calendar-week__days">
            {weekDays.map((day) => (
              <button className={`calendar-week__day${"isToday" in day && day.isToday ? " calendar-week__day--today" : ""}`} key={day.day} type="button">
                <span className="calendar-week__label">{day.day}</span>
                <span className="calendar-week__date">{day.date}</span>
                <span className={`calendar-week__dot calendar-week__dot--${day.tone}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="calendar-week__caption">Uke 23 · Tirsdag 3. juni 2025</p>
        </section>

        <section className="calendar-section calendar-section--today" aria-labelledby="today-title">
          <div className="calendar-section__header">
            <div className="calendar-section__heading">
              <span className="calendar-section__icon" aria-hidden="true">☀️</span>
              <h2 className="calendar-section__title" id="today-title">I dag, tirsdag 3. juni</h2>
            </div>
            <button className="calendar-section__button" type="button">Vis dag <span aria-hidden="true">›</span></button>
          </div>

          <div className="family-event-list">
            {todayEvents.map((event) => (
              <article className={`family-event family-event--${event.tone}`} key={`${event.person}-${event.title}`}>
                <div className={`family-event__avatar family-event__avatar--${event.tone}`} aria-hidden="true">{event.initials}</div>
                <div className="family-event__copy">
                  <h3 className="family-event__title">{event.person} – {event.title}</h3>
                  <p className="family-event__location">{event.location}</p>
                </div>
                <time className="family-event__time">{event.time}</time>
                <span className="family-event__icon" aria-hidden="true">{event.icon}</span>
              </article>
            ))}
          </div>

          <button className="calendar-section__footer-button" type="button">Se alle dagens hendelser <span aria-hidden="true">›</span></button>
        </section>

        <section className="calendar-section" aria-labelledby="upcoming-title">
          <div className="calendar-section__header">
            <h2 className="calendar-section__title" id="upcoming-title">Kommende denne uken</h2>
          </div>
          <div className="upcoming-list">
            {upcomingEvents.map((event) => (
              <article className="upcoming-event" key={`${event.day}-${event.title}`}>
                <div className="upcoming-event__date">
                  <span>{event.day}</span>
                  <strong>{event.date}</strong>
                </div>
                <span className={`upcoming-event__icon upcoming-event__icon--${event.tone}`} aria-hidden="true">{event.icon}</span>
                <div className="upcoming-event__copy">
                  <h3 className={`upcoming-event__title upcoming-event__title--${event.tone}`}>{event.title}</h3>
                  <p className="upcoming-event__subtitle">{event.subtitle}</p>
                </div>
                <time className="upcoming-event__time">{event.time}</time>
              </article>
            ))}
          </div>
          <button className="calendar-section__footer-button" type="button">Se hele uken <span aria-hidden="true">›</span></button>
        </section>
      </PageContainer>
    </AppShell>
  );
}
