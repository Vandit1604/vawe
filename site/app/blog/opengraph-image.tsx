import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "blog",
    title: "The vawe blog",
    description: "Engineering notes from building vawe, where agents write motion graphics as HTML: what broke, what we measured and what we changed.",
    path: "/blog",
  });
}
