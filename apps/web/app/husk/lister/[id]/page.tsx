import type { Metadata } from "next";

import { HuskListDetailClient } from "./HuskListDetailClient";
import type { HuskListDetail } from "../../mockHuskData";

interface HuskListDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Liste – Husk" };
}

export default async function HuskListDetailPage({ params }: HuskListDetailPageProps) {
  const { id } = await params;
  const list: HuskListDetail = {
    id,
    title: "Laster liste …",
    scopeText: "Hele familien",
    completedCount: 0,
    totalCount: 0,
    familyMembers: [],
    items: [],
  };

  return <HuskListDetailClient list={list} />;
}
