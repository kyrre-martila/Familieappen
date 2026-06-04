import type { Metadata } from "next";

import { HuskFocusFormClient } from "../../../HuskFocusFormClient";
import type { HuskListGroup } from "../../../mockHuskData";

interface EditHuskListPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Rediger liste – Husk" };
}

export default async function EditHuskListPage({ params }: EditHuskListPageProps) {
  const { id } = await params;
  const list: HuskListGroup = {
    id,
    title: "",
    completedCount: 0,
    totalCount: 0,
    archived: false,
    icon: "home",
    tone: "blue",
    memberIds: [],
  };

  return <HuskFocusFormClient kind="list" mode="edit" list={list} />;
}
