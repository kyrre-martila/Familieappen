import { AppText, Card, LoadingState, Screen } from "../src/components";
export default function BootstrapScreen() { return <Screen scroll={false}><Card><AppText variant="label">FamilieAppen</AppText><AppText variant="title">Rolig familieflyt</AppText><AppText>Vi gjør klart et varmt og trygt utgangspunkt for appen.</AppText></Card><LoadingState description="Grunnoppsett lastes." /></Screen>; }
