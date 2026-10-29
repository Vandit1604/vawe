import { OG_SIZE, brandOgImage } from "./components/ogCard";
import { HOME } from "../lib/content/home";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "vawe: HTML to video for developers and AI agents";

export default function Image() {
  return brandOgImage(HOME.hero.lede);
}
