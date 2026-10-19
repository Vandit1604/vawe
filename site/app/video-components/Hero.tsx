// A film editor in miniature: a filmstrip of real clip frames over a timeline with clip blocks,
// keyframe diamonds and a playhead. No words, so it still reads as video with the text blurred.
type Block = { at: number; len: number; lane: string; keys: number[] };

const TRACKS: Block[][] = [
  [
    { at: 2, len: 22, lane: "text", keys: [0.2, 0.8] },
    { at: 27, len: 30, lane: "media", keys: [0.5] },
    { at: 60, len: 36, lane: "text", keys: [0.15, 0.55, 0.9] },
  ],
  [
    { at: 8, len: 34, lane: "shape", keys: [0.3, 0.7] },
    { at: 45, len: 20, lane: "comp", keys: [0.5] },
    { at: 68, len: 28, lane: "shape", keys: [0.25, 0.75] },
  ],
  [
    { at: 0, len: 40, lane: "camera", keys: [0.1, 0.5, 0.95] },
    { at: 44, len: 52, lane: "camera", keys: [0.35, 0.8] },
  ],
  [
    { at: 4, len: 14, lane: "sound", keys: [] },
    { at: 24, len: 24, lane: "sound", keys: [] },
    { at: 56, len: 18, lane: "sound", keys: [] },
    { at: 80, len: 16, lane: "sound", keys: [] },
  ],
];

export function Hero({ posters }: { posters: { src: string }[] }) {
  return (
    <div className="mv-hero" aria-hidden="true">
      <div className="mv-strip">
        {posters.map((p, i) => (
          <span key={p.src} className="mv-strip-f" data-cur={i === 2 || undefined}>
            <img src={p.src} alt="" width={320} height={180} decoding="async" loading="eager" />
          </span>
        ))}
      </div>
      <div className="mv-tl">
        <div className="mv-ruler" />
        {TRACKS.map((blocks, t) => (
          <div key={t} className="mv-track">
            {blocks.map((b) => (
              <span key={b.at} className="mv-block" data-lane={b.lane} style={{ left: `${b.at}%`, width: `${b.len}%` }}>
                {b.keys.map((k) => (
                  <i key={k} className="mv-key" style={{ left: `${k * 100}%` }} />
                ))}
              </span>
            ))}
          </div>
        ))}
        <div className="mv-head-track">
          <span className="mv-playhead" />
        </div>
      </div>
    </div>
  );
}
