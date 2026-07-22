import { getAgendaStartDate } from "./agendaStart";

function assertEqual<T>(actual: T, expected: T, description: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
assertEqual(getAgendaStartDate([{ date: "2026-01-01" }, { date: "2026-07-22" }], "2026-07-22"), "2026-07-22", "hendelse tidligere i år + i dag velger i dag");
assertEqual(getAgendaStartDate([{ date: "2026-01-01" }, { date: "2026-07-23" }], "2026-07-22"), "2026-07-23", "ingen i dag velger første fremtidige");
assertEqual(getAgendaStartDate([{ date: "2026-01-01" }, { date: "2026-07-21" }], "2026-07-22"), "2026-07-21", "kun historiske velger siste historiske");
assertEqual(getAgendaStartDate([{ date: "2026-07-24" }, { date: "2026-07-22" }], "2026-07-22"), "2026-07-22", "hendelser sorteres før indeks beregnes");
assertEqual(getAgendaStartDate([{ date: "2026-03-29" }, { date: "2026-03-30" }], "2026-03-30"), "2026-03-30", "lokal dato rundt midnatt håndteres som dato");
