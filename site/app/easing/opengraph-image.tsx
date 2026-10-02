import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "easing",
    title: "Easing functions as CSS",
    description: "Curve, velocity, cubic-bezier, linear() and a live demo for every ease.",
    path: "/easing",
  });
}
