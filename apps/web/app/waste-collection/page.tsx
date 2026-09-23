"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer, SectionHeader } from "../../components/ui";
import { ApiError, getWasteEvents, getWasteSubscription, type WasteEvent, type WasteSubscription } from "../../lib/api";
import { ALL_WASTE_FRACTIONS, availableWasteFractions, filterWasteEvents } from "./wasteCollectionView";

function osloToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function plusDays(date: string, days: number) { const [y,m,d] = date.split("-").map(Number); const value = new Date(Date.UTC(y,m-1,d+days)); return `${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,"0")}-${String(value.getUTCDate()).padStart(2,"0")}`; }
function displayDate(date: string) { const [y,m,d] = date.split("-").map(Number); return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long" }).format(new Date(Date.UTC(y,m-1,d,12))); }

export default function WasteCollectionPage() {
  const access = useFamilyAccess();
  const familyId = access.familyContext?.activeFamilyId ?? null;
  const [subscription, setSubscription] = useState<WasteSubscription | null>(null);
  const [events, setEvents] = useState<WasteEvent[]>([]);
  const [activeFraction, setActiveFraction] = useState(ALL_WASTE_FRACTIONS);
  const [state, setState] = useState<"loading" | "ready" | "no-address" | "error">("loading");
  const fractions = useMemo(() => availableWasteFractions(events), [events]);
  const visibleEvents = useMemo(() => filterWasteEvents(events, activeFraction), [activeFraction, events]);

  useEffect(() => {
    if (!familyId) return;
    let live = true;
    const from = osloToday();
    getWasteSubscription(familyId)
      .then(async (sub) => {
        const items = await getWasteEvents(familyId, from, plusDays(from, 90));
        if (live) { setSubscription(sub); setEvents(items); setState("ready"); }
      })
      .catch((error) => { if (live) setState(error instanceof ApiError && error.status === 404 ? "no-address" : "error"); });
    return () => { live = false; };
  }, [familyId]);

  return <AppShell title="Renovasjon"><PageContainer><section className="waste-page"><SectionHeader eyebrow="Hjemmet" title="Renovasjon" />
    {state === "loading" ? <Card><EmptyState title="Henter renovasjon" description="Vent litt mens vi finner neste tømming." /></Card> : null}
    {state === "no-address" ? <Card><EmptyState title="Legg til familiens adresse" description="Renovasjon konfigureres automatisk når en offisiell adresse er lagret."/><Link className="button button--primary" href="/settings/family">Gå til familieinnstillinger</Link></Card> : null}
    {state === "error" ? <Card><EmptyState title="Renovasjon er ikke tilgjengelig akkurat nå" description="Prøv igjen senere. Familiens adresse er fortsatt lagret." /></Card> : null}
    {state === "ready" && subscription ? <>
      <Card><p className="waste-address-label">Familiens adresse</p><strong>{subscription.address.streetName} {subscription.address.houseNumber}{subscription.address.houseLetter}<br/>{subscription.address.postalCode} {subscription.address.postalPlace}</strong>{subscription.lastSyncStatus === "error" ? <p className="waste-warning">Siste synkronisering feilet. Vi prøver igjen automatisk.</p> : null}</Card>
      <Card><h2>Neste tømminger</h2>{events.length ? <>
        <div className="waste-filters" role="group" aria-label="Filtrer på avfallstype">
          <button type="button" className={`waste-filter${activeFraction === ALL_WASTE_FRACTIONS ? " waste-filter--active" : ""}`} aria-pressed={activeFraction === ALL_WASTE_FRACTIONS} onClick={() => setActiveFraction(ALL_WASTE_FRACTIONS)}>Vis alle</button>
          {fractions.map((fraction) => <button type="button" className={`waste-filter${activeFraction === fraction.id ? " waste-filter--active" : ""}`} aria-pressed={activeFraction === fraction.id} onClick={() => setActiveFraction(fraction.id)} key={fraction.id}>{fraction.name}</button>)}
        </div>
        {visibleEvents.length ? <ul className="waste-events">{visibleEvents.map((event) => <li key={event.id}><strong>{event.name}</strong><time dateTime={event.collectionDate}>{displayDate(event.collectionDate)}</time></li>)}</ul> : <p>Ingen kommende tømminger for valgt avfallstype.</p>}
      </> : <p>Vi har ingen tilgjengelige tømmedata ennå. Dette betyr ikke nødvendigvis at det ikke er planlagt tømming.</p>}</Card>
    </> : null}
  </section></PageContainer></AppShell>;
}
