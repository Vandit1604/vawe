import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "inspiration",
    title: "Motion video inspiration",
    description: "Motion videos made with Claude and other AI, from posts on X. Each one credits its creator and links the post.",
    path: "/inspiration",
  });
}
