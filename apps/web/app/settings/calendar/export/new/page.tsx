import { AppShell } from "../../../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../../../components/ProtectedFamilyRoute";
import { CalendarFeedDetailClient } from "../CalendarFeedDetailClient";
export default function Page(){return <ProtectedFamilyRoute><AppShell title="Innstillinger"><CalendarFeedDetailClient/></AppShell></ProtectedFamilyRoute>}
