import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AppText, AuthScreenShell, TextButton } from "../../components";
import { theme } from "../../theme/tokens";

const termsSections = [
  ["Bruk av appen", "FamilieAppen er laget for å hjelpe familier med hverdagsplanlegging. Du er ansvarlig for at informasjonen du legger inn er riktig og egnet for deling med familien din."],
  ["Familiedata", "Innhold du oppretter kan være synlig for andre medlemmer i familien. Ikke legg inn sensitive opplysninger som ikke bør deles."],
  ["Tilgjengelighet", "Vi jobber for stabil drift, men kan ikke garantere at tjenesten alltid er tilgjengelig."],
  ["Endringer i vilkår", "Dette er en forenklet oversikt under utvikling. Fullstendige vilkår publiseres før lansering."],
];

const privacySections = [
  ["Hva lagrer vi?", "FamilieAppen lagrer informasjon du selv legger inn, som kalenderhendelser, husk, middager, handlelister, ønskelister og familiemedlemmer."],
  ["Hvorfor lagrer vi det?", "Data brukes for å gjøre appen nyttig for familien din og synkronisere innhold mellom familiemedlemmer."],
  ["Kalender og abonnement", "Hvis du bruker kalenderimport eller privat kalenderlenke (ICS), deles kun det som er nødvendig for å vise hendelser i kalenderklienter som Apple Kalender eller Google Kalender."],
  ["Hvem kan se data?", "Innhold deles kun med medlemmer i familien din. Private kalenderlenker bør behandles som hemmelige og kun deles med personer du stoler på."],
  ["E-post og varsler", "FamilieAppen kan sende e-post knyttet til innlogging, sikkerhet og viktige varsler. Du kan selv styre varsler i appen."],
  ["Endringer", "Dette er en forenklet personvernoversikt under utvikling. Full personvernerklæring publiseres før lansering."],
];

export function LegalContentScreen({ kind }: { kind: "terms" | "privacy" }) {
  const isTerms = kind === "terms";
  const sections = isTerms ? termsSections : privacySections;
  return <AuthScreenShell title={isTerms ? "Vilkår" : "Personvern"} lead={isTerms ? "En enkel oversikt over vilkårene for FamilieAppen." : "En rolig oversikt over hvordan FamilieAppen behandler data."}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {sections.map(([title, body]) => <View key={title} style={styles.section}><AppText variant="heading">{title}</AppText><AppText>{body}</AppText></View>)}
      <TextButton title="Tilbake" onPress={() => router.back()} />
    </ScrollView>
  </AuthScreenShell>;
}
const styles = StyleSheet.create({ scroll: { width: "100%", maxWidth: 620 }, content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl }, section: { gap: theme.spacing.xs } });
