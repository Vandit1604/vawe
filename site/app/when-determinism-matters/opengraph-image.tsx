import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "decision",
    title: "Vawe · when determinism actually matters",
    description:
      "Byte-identical rendering is a real property, not a universal one. When it decides which engine to pick, and when it does not.",
    path: "/when-determinism-matters",
  });
}
