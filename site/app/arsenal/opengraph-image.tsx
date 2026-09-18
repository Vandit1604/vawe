import { OG_SIZE, staticOgImage } from "../components/ogCard";
import data from "../../lib/arsenal.json";

export const size = OG_SIZE;
export const contentType = "image/png";

const D = data as { total: number; live: number };

export default function Image() {
  return staticOgImage({
    tag: "arsenal",
    title: "Vawe · arsenal",
    description:
      `Everything the Vawe engine is made of: ${D.total} blocks and effects, searchable, ` +
      `each with the JSON that uses it and ${D.live} of them playing in the real engine.`,
    path: "/arsenal",
  });
}
