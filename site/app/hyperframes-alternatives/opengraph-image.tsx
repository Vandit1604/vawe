import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "alternatives",
    title: "Vawe · HyperFrames alternatives",
    description:
      "The one close peer HyperFrames has: same license, same self-hosted shape, a different composition language and a different way of enforcing determinism. Read 2026-09-19.",
    path: "/hyperframes-alternatives",
  });
}
