import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AppText, AuthScreenShell, TextButton } from "../../src/components";
import { theme } from "../../src/theme/tokens";
const sections = [
  ["Bruk av appen", "FamilieAppen er laget for å hjelpe familier med planlegging, kalender, husk, middager, handlelister og ønskelister."],
  ["Familier og deling", "Innhold du legger inn kan deles med medlemmer i familien du er en del av. Administratorer i familien kan invitere eller godkjenne nye medlemmer."],
  ["Kalenderimport og abonnement", "Kalenderimport (ICS) og private kalenderlenker brukes på eget ansvar. Del aldri private kalenderlenker offentlig, siden de kan gi innsyn i familiens hendelser."],
  ["Brukeransvar", "Du er ansvarlig for informasjon du legger inn og hvem du velger å dele familieinnhold med."],
  ["Endringer og tilgjengelighet", "FamilieAppen er under utvikling. Funksjoner kan endres, forbedres eller fjernes underveis for å gjøre appen bedre."],
  ["Endringer i vilkår", "Dette er en forenklet oversikt under utvikling. Fullstendige vilkår publiseres før lansering."],
];
export default function TermsScreen() { return <AuthScreenShell title="Vilkår" lead="En enkel oversikt over vilkårene for FamilieAppen."><ScrollView style={styles.scroll} contentContainerStyle={styles.content}>{sections.map(([title, body]) => <View key={title} style={styles.section}><AppText variant="heading">{title}</AppText><AppText>{body}</AppText></View>)}<TextButton title="Tilbake" onPress={() => router.back()} /></ScrollView></AuthScreenShell>; }
const styles = StyleSheet.create({ scroll: { width: "100%", maxWidth: 620 }, content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl }, section: { gap: theme.spacing.xs } });
