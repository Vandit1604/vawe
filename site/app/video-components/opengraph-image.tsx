import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "video components",
    title: "Video components",
    description:
      "Each video component is a clip and one markdown file: when to use it, the snippet, the notes and the sound cue.",
    path: "/video-components",
  });
}
