import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "determinism",
    title: "Same page in. Same frames out.",
    description:
      "Ask for the frame at 4.2\u00a0seconds twice, in any order, and it comes back the same. The clock is replaced before the page runs.",
    path: "/determinism",
  });
}
