import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "alternatives",
    title: "Vawe · HyperFrames alternatives",
    description:
      "The one close peer HyperFrames has: same license, same self-hosted shape, both compose from HTML, timed and made deterministic in different ways. Read 2026-09-19.",
    path: "/hyperframes-alternatives",
  });
}
