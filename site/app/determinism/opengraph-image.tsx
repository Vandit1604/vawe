import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "determinism",
    title: "Vawe · deterministic video rendering",
    description:
      "A page seeked, never played: a virtual clock, the same frames on every render in any order, and a test that renders twice and compares.",
    path: "/determinism",
  });
}
