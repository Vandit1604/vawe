const GROUP_PATHS: Record<string, string[]> = {
  "reveal-a-title": ["M4 7V4h16v3", "M9 20h6", "M12 4v16"],
  "change-between-shots": ["M8 3 4 7l4 4", "M4 7h16", "m16 21 4-4-4-4", "M20 17H4"],
  "point-the-eye": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M22 12h-4", "M6 12H2", "M12 6V2", "M12 22v-4"],
  "move-the-camera": ["m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11", "M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"],
  "end-a-film": ["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z", "M4 22v-7"],
  "product-moments": ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z", "M2 10h20", "M6 7h.01"],
  grounds: [
    "M12.8 2.2a2 2 0 0 0-1.6 0L2.6 6.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9a1 1 0 0 0 0-1.8Z",
    "m22 17.6-9.2 4.2a2 2 0 0 1-1.6 0L2 17.6",
    "m22 12.6-9.2 4.2a2 2 0 0 1-1.6 0L2 12.6",
  ],
};
const MISC_PATHS = {
  play: ["M5 5a2 2 0 0 1 3-1.7l12 7a2 2 0 0 1 0 3.4l-12 7A2 2 0 0 1 5 19z"],
  pause: ["M8 5v14", "M16 5v14"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3"],
  sliders: ["M4 6h10", "M18 6h2", "M4 12h2", "M10 12h10", "M4 18h12", "M20 18h0", "M14 4v4", "M6 10v4", "M16 16v4"],
  json: ["M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1", "M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"],
  curve: ["M3 20C10 20 9 4 21 4", "M3 20h.01", "M21 4h.01"],
  copy: ["M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z", "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"],
  check: ["M20 6 9 17l-5-5"],
  file: ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v4a2 2 0 0 0 2 2h4", "M10 9H8", "M16 13H8", "M16 17H8"],
  prev: ["m12 19-7-7 7-7", "M19 12H5"],
  next: ["M5 12h14", "m12 5 7 7-7 7"],
  loop: ["m17 2 4 4-4 4", "M3 11v-1a4 4 0 0 1 4-4h14", "m7 22-4-4 4-4", "M21 13v1a4 4 0 0 1-4 4H3"],
  clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 6v6l4 2"],
  sun: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"],
  film: ["M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z", "M7 3v18", "M17 3v18", "M3 8h4", "M3 16h4", "M17 8h4", "M17 16h4"],
} as const;

export type MiscIcon = keyof typeof MISC_PATHS;

function Svg({ paths, size, className }: { paths: readonly string[]; size: number; className?: string }) {
  return (
    <svg className={className ?? "ico"} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export const GroupIcon = ({ id, size = 16 }: { id: string | null; size?: number }) => <Svg paths={GROUP_PATHS[id ?? ""] ?? GROUP_PATHS.grounds} size={size} />;
export const MiscSvg = ({ name, size = 16 }: { name: MiscIcon; size?: number }) => <Svg paths={MISC_PATHS[name]} size={size} />;
