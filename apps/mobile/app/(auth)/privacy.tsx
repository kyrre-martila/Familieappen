import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AppText, AuthScreenShell, TextButton } from "../../src/components";
import { theme } from "../../src/theme/tokens";
const sections = [
  ["Hva lagrer vi?", "FamilieAppen lagrer informasjon du selv legger inn, som kalenderhendelser, husk, middager, handlelister, ønskelister og familiemedlemmer."],
  ["Hvorfor lagrer vi det?", "Data brukes for å gjøre appen nyttig for familien din og synkronisere innhold mellom familiemedlemmer."],
  ["Kalender og abonnement", "Hvis du bruker kalenderimport eller privat kalenderlenke (ICS), deles kun det som er nødvendig for å vise hendelser i kalenderklienter som Apple Kalender eller Google Kalender."],
  ["Hvem kan se data?", "Innhold deles kun med medlemmer i familien din. Private kalenderlenker bør behandles som hemmelige og kun deles med personer du stoler på."],
  ["E-post og varsler", "FamilieAppen kan sende e-post knyttet til innlogging, sikkerhet og viktige varsler. Du kan selv styre varsler i appen."],
  ["Endringer", "Dette er en forenklet personvernoversikt under utvikling. Full personvernerklæring publiseres før lansering."],
];
export default function PrivacyScreen() { return <AuthScreenShell title="Personvern" lead="En rolig oversikt over hvordan FamilieAppen behandler data."><ScrollView style={styles.scroll} contentContainerStyle={styles.content}>{sections.map(([title, body]) => <View key={title} style={styles.section}><AppText variant="heading">{title}</AppText><AppText>{body}</AppText></View>)}<TextButton title="Tilbake" onPress={() => router.back()} /></ScrollView></AuthScreenShell>; }
const styles = StyleSheet.create({ scroll: { width: "100%", maxWidth: 620 }, content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl }, section: { gap: theme.spacing.xs } });
