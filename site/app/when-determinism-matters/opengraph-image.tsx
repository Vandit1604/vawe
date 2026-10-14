import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "decision",
    title: "When determinism matters.",
    description:
      "Byte-identical rendering is a real, checkable property. It is also not the reason to pick a rendering engine most of the time.",
    path: "/when-determinism-matters",
  });
}
