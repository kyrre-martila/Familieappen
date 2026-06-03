import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HuskFocusFormClient } from "../../../HuskFocusFormClient";
import { huskMockData } from "../../../mockHuskData";

interface EditHuskListPageProps {
  params: Promise<{ id: string }>;
}

function getList(id: string) {
  return huskMockData.listGroups.find((list) => list.id === id) ?? null;
}

export async function generateMetadata({ params }: EditHuskListPageProps): Promise<Metadata> {
  const { id } = await params;
  const list = getList(id);

  return {
    title: list ? `Rediger ${list.title} – Lister` : "Rediger liste – Husk",
  };
}

export default async function EditHuskListPage({ params }: EditHuskListPageProps) {
  const { id } = await params;
  const list = getList(id);

  if (!list) {
    notFound();
  }

  return <HuskFocusFormClient kind="list" mode="edit" list={list} />;
}
