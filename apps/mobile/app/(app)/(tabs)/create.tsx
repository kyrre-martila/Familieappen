import { useState } from "react";
import { router } from "expo-router";
import { PlaceholderScreen } from "../../../src/components/PlaceholderScreen";
import { Button } from "../../../src/components";
import { CreateActionSheet } from "../../../src/features/create/CreateActionSheet";
export default function CreateScreen() { const [visible, setVisible] = useState(true); return <><PlaceholderScreen title="Opprett" description="Velg hva du vil opprette når funksjonene blir klare."><Button title="Vis valg" onPress={() => setVisible(true)} /></PlaceholderScreen><CreateActionSheet visible={visible} onClose={() => { setVisible(false); if (router.canGoBack()) router.back(); }} /></>; }
