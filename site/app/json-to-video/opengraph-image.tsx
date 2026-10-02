import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "HTML to video",
    title: "HTML to video: render a page to MP4",
    description: "One HTML page in, one MP4 out. An AI agent can write the page, and every run renders the same frames.",
    path: "/json-to-video",
  });
}
