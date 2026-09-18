import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "editor",
    title: "Vawe · editor",
    description: "Edit a scene JSON and watch it render live. The real engine, running in your browser.",
    path: "/editor",
  });
}
