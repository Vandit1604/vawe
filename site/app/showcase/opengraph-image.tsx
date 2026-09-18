import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "showcase",
    title: "Vawe · showcase",
    description:
      "Finished films rendered by Vawe, each one a JSON file you can open in the editor. Six launch films and one scene cropped to three canvases.",
    path: "/showcase",
  });
}
