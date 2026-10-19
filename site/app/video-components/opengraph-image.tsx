import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "moves",
    title: "Moves",
    description:
      "Each move is a clip and one markdown file: when to use it, the snippet, the notes and the sound cue.",
    path: "/moves",
  });
}
