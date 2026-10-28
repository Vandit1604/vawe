import { headers } from "next/headers";
import { logBotNotFound } from "./bots";

// Call it before notFound(). app/not-found.tsx cannot log: Next renders it inside every page's tree,
// so it runs on 200 responses too. A page that decides the URL has no content runs this only for a 404.
export async function logMissing(): Promise<void> {
  logBotNotFound(await headers());
}
