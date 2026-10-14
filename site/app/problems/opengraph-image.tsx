import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "problems",
    title: "The hard problems in agent-made motion graphics.",
    description:
      "An agent can write a page of HTML in a minute. Turning it into a film that looks designed is the hard part.",
    path: "/problems",
  });
}
