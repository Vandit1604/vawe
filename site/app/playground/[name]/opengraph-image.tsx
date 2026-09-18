import { OG_SIZE, staticOgImage } from "../../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

// No generateStaticParams: the generator list lives in the engine and is loaded client-side (see
// page.tsx's own comment on why it is not imported here to enumerate names). Rendered on demand.
export default async function Image({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return staticOgImage({
    tag: "playground",
    title: "Playground · vawe",
    description: "Turn the dials on the engine's generators in your browser.",
    path: `/playground/${name}`,
  });
}
