// URLs of one move's files. Clips keep their names when a move is re-rendered, so the web copies carry
// ?v=<hash of the source clip> and next.config.mjs caches a versioned URL for a year. The .md is
// never versioned: agents fetch it by its plain name.
export type ClipRef = { name: string; clipHash: string | null };

export const clip = ({ name, clipHash }: ClipRef) => {
  const v = clipHash ? `?v=${clipHash}` : "";
  return {
    mp4: `/moves/${name}.mp4${v}`,
    webm: `/moves/${name}.webm${v}`,
    poster: `/moves/${name}.webp${v}`,
    posterHd: `/moves/${name}.hd.webp${v}`,
    md: `/moves/${name}.md`,
  };
};
