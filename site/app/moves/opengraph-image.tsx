import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "moves",
    title: "Vawe · moves",
    description: "Proven motion moves, each a clip and the markdown an agent copies.",
    path: "/moves",
  });
}
