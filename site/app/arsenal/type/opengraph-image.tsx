import { OG_SIZE, staticOgImage } from "../../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "typography",
    title: "Vawe · typography",
    description:
      "The engine's typographic vocabulary as specimens: kinetic presets, per-layer text mechanics and typographic beats, each playing in the real engine with the JSON that produces it.",
    path: "/arsenal/type",
  });
}
