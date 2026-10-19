// URLs of one move's files. Clips keep their names when a move is re-rendered, so the web copies carry
// ?v=<hash of the source clip> and next.config.mjs caches a versioned URL for a year. The .md is
// never versioned: agents fetch it by its plain name.
export type Theme = "light" | "dark";
export type ClipRef = { name: string; clipHash: string | null; variant?: Theme | null; variantHash?: string | null };

// The clip a theme choice shows: the variant when it is the chosen theme, else the move's own clip.
export const clip = ({ name, clipHash, variant, variantHash }: ClipRef, theme: Theme | null = null) => {
  const useVariant = !!theme && theme === variant && !!variantHash;
  const stem = useVariant ? `${name}-${variant}` : name;
  const hash = useVariant ? variantHash : clipHash;
  const v = hash ? `?v=${hash}` : "";
  return {
    mp4: `/moves/${stem}.mp4${v}`,
    webm: `/moves/${stem}.webm${v}`,
    poster: `/moves/${stem}.webp${v}`,
    posterHd: `/moves/${stem}.hd.webp${v}`,
    md: `/moves/${name}.md`,
  };
};
