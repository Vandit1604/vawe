import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "about",
    title: "About vawe",
    description:
      "vawe renders one HTML page into a film. Open source under Apache-2.0, built so an agent writes the page in the web code it already knows.",
    path: "/about",
  });
}
