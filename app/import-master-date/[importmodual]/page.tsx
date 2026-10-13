import { redirect } from "next/navigation";

/** Old per-master import pages now live on the single Master Imports page. */
const IMPORT_SLUGS: Record<string, string> = {
  medicines: "medicines",
  tests: "lab-tests",
  symptoms: "symptoms",
  diagnosis: "diagnoses",
  colleges: "colleges",
  qualifications: "qualification-specializations",
};

export default async function LegacyImportPage({ params }: { params: Promise<{ importmodual: string }> }) {
  const { importmodual } = await params;
  const master = IMPORT_SLUGS[importmodual];
  redirect(master ? `/imports?master=${master}` : "/imports");
}
