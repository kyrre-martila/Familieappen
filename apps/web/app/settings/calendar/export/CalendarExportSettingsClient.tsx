"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Link as LinkIcon, Plus } from "lucide-react";
import { Badge, Button, Card, SectionHeader } from "../../../../components/ui";
import { ApiError, listCalendarExportFeeds, type CalendarExportFeedSettings } from "../../../../lib/api";
import { useFamilyMembers } from "../../../../features/family/hooks/useFamilyMembers";

const contents = (f: CalendarExportFeedSettings) => [f.includeEvents&&"Kalender",f.includeMeals&&"Middager",f.includeReminders&&"Husk",f.includeSchoolWeekReminders&&"Skoleuka"].filter(Boolean).join(" · ");
export function CalendarExportSettingsClient() {
 const {family,familyMembers}=useFamilyMembers(); const [feeds,setFeeds]=useState<CalendarExportFeedSettings[]>([]); const [error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{if(!family?.id)return; try{setFeeds(await listCalendarExportFeeds(family.id));setError(null)}catch(e){setError(e instanceof ApiError?e.message:"Kunne ikke hente kalenderfeedene")}},[family?.id]);
 useEffect(()=>{void load()},[load]);
 const audience=(f:CalendarExportFeedSettings)=>f.scope==="family"?"Hele familien":f.scope==="mine"?`Kun hendelser for ${familyMembers.find(member=>member.id===f.mineFamilyMemberId)?.name??"ukjent familiemedlem"}`:f.selectedMemberIds.map(id=>familyMembers.find(m=>m.id===id)?.name).filter(Boolean).join(", ")||"Valgte familiemedlemmer";
 return <main className="settings-shell settings-shell--detail calendar-export-settings" aria-label="Kalenderfeeder">
  <Link className="settings-back-link" href="/settings/calendar" aria-label="Tilbake"><ChevronLeft/></Link>
  <header className="settings-hero settings-hero--detail"><h1>Kalenderfeeder</h1><p>Lag separate private kalenderlenker for kalenderapper og tjenester som Home Assistant.</p></header>
  {error?<Card tone="warm"><p>{error}</p></Card>:null}
  <section className="calendar-settings-section"><SectionHeader eyebrow="ICS" title="Dine kalenderfeeder" />
   <div className="calendar-feed-list">{feeds.map(feed=><Link className="calendar-feed-card" href={`/settings/calendar/export/${feed.id}`} key={feed.id}>
    <Card><div className="calendar-export-card__intro"><div className="calendar-import-intro__icon"><LinkIcon size={22}/></div><div><h3>{feed.name}</h3><p>{contents(feed)}</p><p>{audience(feed)}</p></div><Badge tone={feed.enabled?"success":"neutral"}>{feed.enabled?"Aktiv":"Inaktiv"}</Badge></div></Card>
   </Link>)}{feeds.length===0&&!error?<Card tone="soft"><p>Ingen kalenderfeeder ennå.</p></Card>:null}</div>
   <Link href="/settings/calendar/export/new"><Button><Plus size={18}/> Ny kalenderfeed</Button></Link>
  </section>
 </main>
}
