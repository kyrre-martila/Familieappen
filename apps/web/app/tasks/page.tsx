import { redirect } from "next/navigation";

export default function TasksPage() {
  redirect("/husk?tab=oppgaver");
}
