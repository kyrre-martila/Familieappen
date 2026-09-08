import { AppShell } from "../../../../../components/AppShell";
import { ProtectedFamilyRoute } from "../../../../../components/ProtectedFamilyRoute";
import { CalendarFeedDetailClient } from "../CalendarFeedDetailClient";
export default async function Page({params}:{params:Promise<{feedId:string}>}) { const {feedId}=await params; return <ProtectedFamilyRoute><AppShell title="Innstillinger"><CalendarFeedDetailClient feedId={feedId}/></AppShell></ProtectedFamilyRoute> }
