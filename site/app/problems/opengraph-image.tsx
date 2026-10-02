import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "problems",
    title: "vawe · hard problems in agent-made motion graphics",
    description: "Thirteen problems, seven solved with numbers, six still open.",
    path: "/problems",
  });
}
