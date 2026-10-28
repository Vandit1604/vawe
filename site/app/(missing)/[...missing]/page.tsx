import { notFound } from "next/navigation";
import { logMissing } from "../../../lib/missing";

// Catches every URL that no route owns, so the 404 is logged for bots.
export default async function Missing() {
  await logMissing();
  notFound();
}
