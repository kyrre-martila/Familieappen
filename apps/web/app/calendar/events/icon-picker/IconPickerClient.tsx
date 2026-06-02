"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, Lightbulb } from "lucide-react";

import { eventIconOptions, getDraftStorageKey, type CalendarEventFormDraft, type EventFormIconId } from "../eventFormModel";

function getSelectedIcon(draftKey: string) {
  if (typeof window === "undefined") {
    return "";
  }

  const storedDraft = window.sessionStorage.getItem(draftKey);
  const pickedIcon = window.sessionStorage.getItem(`${draftKey}:icon`);

  if (pickedIcon) {
    return pickedIcon;
  }

  if (!storedDraft) {
    return "";
  }

  try {
    return (JSON.parse(storedDraft) as CalendarEventFormDraft).iconId;
  } catch {
    return "";
  }
}

export function IconPickerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/calendar/events/new";
  const draftKey = searchParams.get("draftKey") ?? getDraftStorageKey("create");
  const selectedIcon = getSelectedIcon(draftKey);

  function handleSelect(iconId: EventFormIconId) {
    const storedDraft = window.sessionStorage.getItem(draftKey);

    if (storedDraft) {
      try {
        const parsedDraft = JSON.parse(storedDraft) as CalendarEventFormDraft;
        window.sessionStorage.setItem(draftKey, JSON.stringify({ ...parsedDraft, iconId }));
      } catch {
        window.sessionStorage.setItem(`${draftKey}:icon`, iconId);
      }
    }

    window.sessionStorage.setItem(`${draftKey}:icon`, iconId);
    router.push(returnTo);
  }

  return (
    <main className="icon-picker-screen" aria-labelledby="icon-picker-title">
      <header className="icon-picker-topbar">
        <button className="icon-picker-topbar__back" type="button" onClick={() => router.push(returnTo)} aria-label="Tilbake til hendelsesskjema">
          <ChevronLeft aria-hidden="true" size={30} strokeWidth={2.8} />
        </button>
        <h1 id="icon-picker-title">Velg ikon</h1>
        <span aria-hidden="true" />
      </header>

      <section className="icon-picker-grid" aria-label="Ikoner">
        {eventIconOptions.map(({ id, label, Icon }) => {
          const isSelected = selectedIcon === id;

          return (
            <button
              className={`icon-picker-card ${isSelected ? "icon-picker-card--selected" : ""}`}
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              aria-pressed={isSelected}
              aria-label={`${label}${isSelected ? ", valgt ikon" : ""}`}
            >
              <span className="icon-picker-card__check" aria-hidden="true"><Check size={16} strokeWidth={3.2} /></span>
              <span className="icon-picker-card__icon" aria-hidden="true"><Icon size={32} strokeWidth={2.2} /></span>
              <span className="icon-picker-card__label">{label}</span>
            </button>
          );
        })}
      </section>

      <aside className="icon-picker-hint" aria-label="Tips om ikonvalg">
        <span className="icon-picker-hint__icon" aria-hidden="true"><Lightbulb size={24} /></span>
        <p>Ikonet hjelper familien med å se hva hendelsen gjelder. Du kan endre det senere.</p>
      </aside>
    </main>
  );
}
