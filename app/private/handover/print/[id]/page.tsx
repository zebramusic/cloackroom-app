import type { Metadata } from "next";
import PrintClient from "@/app/private/handover/print/PrintClient";

export const metadata: Metadata = { title: "Print handover report" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PrintClient id={id} />;
}
