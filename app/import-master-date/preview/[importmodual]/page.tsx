import { redirect } from "next/navigation";
import { LEGACY_MASTER_SLUGS } from "@/lib/masters";

/** Old preview URLs redirect to the master data pages. */
export default async function LegacyPreviewPage({ params }: { params: Promise<{ importmodual: string }> }) {
  const { importmodual } = await params;
  redirect(`/masters/${LEGACY_MASTER_SLUGS[importmodual] ?? "master_medicines"}`);
}
