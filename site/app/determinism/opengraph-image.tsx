import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "determinism",
    title: "Vawe · deterministic video rendering",
    description:
      "renderFrame(n) is a pure function of n: same JSON, byte-identical frames, any order, any machine, proven by two gates on every scene.",
    path: "/determinism",
  });
}
