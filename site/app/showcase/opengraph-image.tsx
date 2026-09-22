import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "showcase",
    title: "Vawe · showcase",
    description:
      "What the engine made: one scene cropped to three canvases today, with baseline launch films on the way, each one a JSON file you can open in the editor.",
    path: "/showcase",
  });
}
