import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { huskListDetails } from "../../mockHuskData";
import { HuskListDetailClient } from "./HuskListDetailClient";

interface HuskListDetailPageProps {
  params: Promise<{ id: string }>;
}

function getListDetail(id: string) {
  return huskListDetails.find((list) => list.id === id) ?? null;
}

export async function generateMetadata({ params }: HuskListDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const list = getListDetail(id);

  return {
    title: list ? `${list.title} – Lister` : "Liste – Husk",
  };
}

export default async function HuskListDetailPage({ params }: HuskListDetailPageProps) {
  const { id } = await params;
  const list = getListDetail(id);

  if (!list) {
    notFound();
  }

  return <HuskListDetailClient list={list} />;
}
