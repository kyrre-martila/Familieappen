export type HuskTab = "husk" | "lister" | "skoleuka";

export interface HuskReminder {
  id: string;
  title: string;
  note: string;
  dueLabel: string;
  audience: string;
  tone: "blue" | "green" | "orange" | "purple";
}

export interface HuskListItem {
  id: string;
  label: string;
  meta?: string;
}

export interface HuskListGroup {
  id: string;
  title: string;
  description: string;
  owner: string;
  itemCount: number;
  archived: boolean;
  items: HuskListItem[];
}

export interface HuskSchoolDayPlan {
  id: string;
  dayLabel: string;
  dateLabel: string;
  focus: string;
  packing: string[];
  notes: string;
}

export interface HuskMockData {
  reminders: HuskReminder[];
  listGroups: HuskListGroup[];
  schoolWeek: HuskSchoolDayPlan[];
}

export const huskMockData: HuskMockData = {
  reminders: [
    {
      id: "reminder-gymbag",
      title: "Gymbag til tirsdag",
      note: "Legg frem gymsko og ren treningstrøye etter middag.",
      dueLabel: "I kveld",
      audience: "Emil",
      tone: "green",
    },
    {
      id: "reminder-library",
      title: "Bibliotekbok i sekken",
      note: "Boken ligger på kjøkkenbenken og skal leveres før helgen.",
      dueLabel: "Fredag",
      audience: "Alle barna",
      tone: "blue",
    },
    {
      id: "reminder-trip",
      title: "Svar på turmelding",
      note: "Skolen trenger bekreftelse på bålmat og transport.",
      dueLabel: "Innen 12:00",
      audience: "Foresatte",
      tone: "orange",
    },
  ],
  listGroups: [
    {
      id: "list-morning",
      title: "Morgenrutine",
      description: "Rolige steg før avreise til skole og barnehage.",
      owner: "Familien",
      itemCount: 5,
      archived: false,
      items: [
        { id: "morning-lunch", label: "Matbokser i sekken", meta: "Kjøkken" },
        { id: "morning-clothes", label: "Uteklær etter vær", meta: "Gang" },
        { id: "morning-water", label: "Drikkeflasker fylt", meta: "Alle" },
      ],
    },
    {
      id: "list-weekend",
      title: "Helgepakking",
      description: "Fast liste for overnatting hos besteforeldre.",
      owner: "Eva",
      itemCount: 7,
      archived: false,
      items: [
        { id: "weekend-pjs", label: "Pysj og kosedyr" },
        { id: "weekend-toothbrush", label: "Tannbørster" },
        { id: "weekend-medicine", label: "Allergimedisin", meta: "Ved behov" },
      ],
    },
    {
      id: "list-summer-archive",
      title: "Sommeravslutning 2025",
      description: "Arkivert plan fra fjorårets avslutning.",
      owner: "Familien",
      itemCount: 4,
      archived: true,
      items: [{ id: "summer-cake", label: "Kakeform" }],
    },
  ],
  schoolWeek: [
    {
      id: "school-monday",
      dayLabel: "Mandag",
      dateLabel: "2. juni",
      focus: "Lesing og svømming",
      packing: ["Badetøy", "Lesemappe"],
      notes: "Husk vått pose til svømmetøy.",
    },
    {
      id: "school-wednesday",
      dayLabel: "Onsdag",
      dateLabel: "4. juni",
      focus: "Uteskole",
      packing: ["Sitteunderlag", "Varm drikke", "Ekstra sokker"],
      notes: "Oppmøte ved skogporten kl. 08:30.",
    },
    {
      id: "school-friday",
      dayLabel: "Fredag",
      dateLabel: "6. juni",
      focus: "Innlevering og vennegruppe",
      packing: ["Bibliotekbok", "Gymbag"],
      notes: "Vennegruppen går hjem med Nora etter skolen.",
    },
  ],
};
