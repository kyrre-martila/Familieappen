import { getAgendaStartDate, getAgendaStartIndex, shouldRunInitialAgendaScroll } from "./agendaStart";

function assertEqual<T>(actual: T, expected: T, description: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

assertEqual(getAgendaStartDate([{ date: "2026-01-01" }, { date: "2026-07-22" }], "2026-07-22"), "2026-07-22", "hendelse tidligere i år + i dag velger i dag");
assertEqual(getAgendaStartDate([{ date: "2026-07-22", startTime: "14:00" }, { date: "2026-07-22", startTime: "08:00" }], "2026-07-22"), "2026-07-22", "flere hendelser i dag velger dagens dato etter tidssortering");
assertEqual(getAgendaStartIndex([{ date: "2026-07-22", startTime: "14:00" }, { date: "2026-07-22", startTime: "08:00" }], "2026-07-22"), 0, "første hendelse i dag får indeks null i sortert agenda");
assertEqual(getAgendaStartDate([{ date: "2026-01-01" }, { date: "2026-07-23" }], "2026-07-22"), "2026-07-23", "ingen i dag velger første fremtidige");
assertEqual(getAgendaStartDate([{ date: "2026-01-01" }, { date: "2026-07-21" }], "2026-07-22"), "2026-07-21", "kun historiske velger siste historiske");
assertEqual(getAgendaStartDate([{ date: "2026-07-24" }, { date: "2026-07-22" }], "2026-07-22"), "2026-07-22", "hendelser sorteres før indeks beregnes");
assertEqual(getAgendaStartDate([{ date: "2026-03-29" }, { date: "2026-03-30" }], "2026-03-30"), "2026-03-30", "Europe/Oslo lokal dato rundt sommertid håndteres som kalenderdato");
assertEqual(shouldRunInitialAgendaScroll({ view: "list", targetDate: "2026-07-22", didScroll: false, hasMeasuredTarget: true }), true, "autoscroll kjører når liste, target og måling er klar");
assertEqual(shouldRunInitialAgendaScroll({ view: "list", targetDate: "2026-07-22", didScroll: true, hasMeasuredTarget: true }), false, "autoscroll skjer bare én gang");
assertEqual(shouldRunInitialAgendaScroll({ view: "list", targetDate: "2026-07-22", didScroll: true, hasMeasuredTarget: true }), false, "refetch etter initial scroll utløser ikke nytt hopp");
assertEqual(shouldRunInitialAgendaScroll({ view: "day", targetDate: "2026-07-22", didScroll: false, hasMeasuredTarget: true }), false, "dagvisning autoscroller ikke før bytte til liste");
assertEqual(shouldRunInitialAgendaScroll({ view: "list", targetDate: "2026-07-22", didScroll: false, hasMeasuredTarget: false }), false, "bytte til Liste venter til layout er målt");
