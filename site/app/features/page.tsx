import type { ReactNode } from "react";
import Link from "next/link";
import { Header, REPO_URL } from "../components/Header";
import { jsonLdScript, breadcrumbSchema } from "../../lib/schema";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { Clip } from "../components/Clip";
import { MoveClips } from "../components/MoveClips";
import { Next, PageTop, Toc } from "../components/Xp";
import { clip, moveByName, toCard, GROUPS, MOVES } from "../../lib/moves";
import { EASES } from "../../lib/easing";
import { Thumb } from "../easing/Charts";
import { AspectDemo, BlurDemo, MoveFilter, SeekScrubber } from "./Demos";
import "../components/intent.css";
import "../easing/easing.css";
import "./features.css";

export const metadata = pageMetadata({
  title: "vawe features: deterministic HTML to video rendering",
  description:
    "vawe features: a virtual clock that refuses wall time, motion blur that follows the motion, every aspect from one page, a camera lens, a moves library, and a loop that judges a film in a fresh session.",
  path: "/features",
});

/* /features · THE TOUR. Every claim reads off the repo: AGENTS.md, core/engine/page-clock.js, core/layout/aspects.js,
 * core/surfaces/lens.js, harness/media/render-page.mjs, and `bin/vawe <verb> --help` (the command lines below are
 * copied from those help texts). The moves and easing counts read lib/moves.json and lib/easing.json.
 */

const ease = EASES.find((e) => e.slug === "land");
const fast = moveByName("iris-wipe");
const fastClip = fast ? clip(fast) : null;
const lens = moveByName("lens");
const lensClip = lens ? clip(lens) : null;

function Code({ label, children }: { label: string; children: string }) {
  return (
    <div className="codeblock">
      <div className="lbl">{label}</div>
      <pre className="code" tabIndex={0}>{children}</pre>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <p className="ft-stat"><b>{n}</b><span>{label}</span></p>
  );
}

function Feature({ title, children, proof }: { title: string; children: ReactNode; proof: ReactNode }) {
  return (
    <li className="ft-row">
      <div className="ft-text">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
      <div className="ft-proof">{proof}</div>
    </li>
  );
}

function Section({ id, title, lead, visual, children }: { id: string; title: string; lead?: string; visual?: ReactNode; children: ReactNode }) {
  return (
    <section className="isec ft-sec" id={id} aria-labelledby={`${id}-h`}>
      <div className="ft-head">
        <h2 id={`${id}-h`}>{title}</h2>
        {lead ? <p>{lead}</p> : null}
      </div>
      {visual ? <div className="ft-visual">{visual}</div> : null}
      <ul className="ft-list">{children}</ul>
    </section>
  );
}

const PAGE = `<meta name="duration" content="12.4">
<html data-aspect="16:9">
<!-- CSS @keyframes, element.animate(),
     SVG, canvas, three.js -->`;

const SEEK = `window.seek = (t) => draw(t);
// t in seconds; frames are fractional
// no timers, no state between frames`;

const CLOCK = `Date, performance.now   film time in ms
requestAnimationFrame   flushed once per seek
setTimeout/setInterval  fire when t passes them
Math.random             reseeded from t`;

const ASPECTS: [string, string][] = [
  ["16:9", "1920\u00a0×\u00a01080"],
  ["9:16", "1080\u00a0×\u00a01920"],
  ["1:1", "1080\u00a0×\u00a01080"],
  ["4:5", "1080\u00a0×\u00a01350"],
  ["4:3", "1440\u00a0×\u00a01080"],
];

const LITERALS = `bin/vawe studio films/my-launch/page.html --port 8800
// live scrubbable preview,
// edits the page literals in place`;

const RATES = `bin/vawe dev  <page>   // half size, 30 fps, silent
bin/vawe ship <page>   // 60 fps, blur, audio`;

const NEW = `bin/vawe new my-launch --request "<the ask>"
// asks for missing facts first
// --defaults guesses them, unattended`;

const SEE = `bin/vawe see   <mp4 | page | ref-id>
bin/vawe strip <page> --cuts
bin/vawe sheet <page>
bin/vawe compare`;

const WAIVER = `<script type="application/json" id="authoring">
{"allow": ["world-held@3.5-6.2"],
 "_why": {"world-held@3.5-6.2":
  "world s4, 2.7 s: the wordmark is the last beat"}}
</script>`;

const JUDGE = `bin/vawe critique <page>
// in a session that did not write the page
bin/vawe judge <page> --fresh
// a separate headless session scores`;

const APPROVE = `bin/vawe ship films/my-launch/page.html
// refused until the owner runs:
bin/vawe approve`;

const SKILLS = `skills/vawe-brief
skills/vawe-page
skills/vawe-critique
skills/vawe-transitions
skills/vawe-reference`;

const PIPELINE: [string, string][] = [
  ["new", "page.html and brief.md"],
  ["dev", "draft mp4, half size, 30\u00a0fps, silent"],
  ["strip", "one image per cut"],
  ["critique", "notes from a session that did not write the page"],
  ["judge --fresh", "a score from key frames"],
  ["approve", "the owner signs off"],
  ["ship", "final mp4, 60\u00a0fps, blur, audio"],
];

function Pipeline() {
  return (
    <ol className="ftp panel" aria-label="The loop, command by command">
      {PIPELINE.map(([cmd, out], i) => (
        <li key={cmd}>
          <span className="ftp-n mono">{i + 1}</span>
          <code>bin/vawe {cmd}</code>
          <span className="ftp-out">{out}</span>
        </li>
      ))}
    </ol>
  );
}

function HashProof() {
  const cells = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="panel fth" role="img" aria-label="Two renders of the same page produce the same frame hashes">
      {["render A", "render B"].map((r) => (
        <div className="fth-row" key={r}>
          <span className="meta">{r}</span>
          <div className="fth-cells">{cells.map((c) => <i key={c} style={{ opacity: 0.35 + ((c * 37) % 10) / 16 }} />)}</div>
        </div>
      ))}
      <p className="meta fth-eq">every frame hash equal, and the frames differ over time</p>
    </div>
  );
}

function AudioLane() {
  return (
    <div className="panel fta" role="img" aria-label="A voice-over at 1\u00a0s and a hit at 2.4\u00a0s on a 4\u00a0s film, mixed offline">
      <div className="fta-lane"><span className="meta">vo.mp3</span><i style={{ left: "25%", width: "48%" }} /></div>
      <div className="fta-lane"><span className="meta">hit.mp3</span><i style={{ left: "60%", width: "6%" }} /></div>
      <div className="fta-axis meta"><span>0&nbsp;s</span><span>data-at 1</span><span>data-at 2.4</span><span>4&nbsp;s</span></div>
    </div>
  );
}

const LOOK_NAMES = ["clean", "dream-bloom", "film-halation", "anamorphic", "pro-mist", "tilt-shift", "soft-focus", "vintage", "cyanotype", "crt"];

const REF = `bin/vawe new my-copy --ref <ref.mp4>
bin/vawe critique <page> --ref <ref.mp4>
bin/vawe coverage`;

export default function Features() {
  return (
    <div className="shell">
      <Header active="features" />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "Features", url: "/features" }]))} />
      <div className="wrap">
        <main id="content" className="ipage xp" tabIndex={-1}>
          <section className="phead">
            <PageTop group="Product" current="Features" />
            <h1>What the engine decides.</h1>
            <p>
              What one HTML page can use, why it renders the same frames every time, how it looks and sounds,
              the {MOVES.length} moves and {EASES.length} curves you copy, and the loop that judges a film before it ships.
            </p>
            <Toc items={[
              { href: "#page", label: "The page" },
              { href: "#frames", label: "Same frames" },
              { href: "#look", label: "Light and sound" },
              { href: "#library", label: "Moves and easing" },
              { href: "#loop", label: "The loop" },
              { href: "#agents", label: "For agents" },
            ]} />
          </section>

          <Section id="page" title="The page is the film." lead="If something you would naturally write fails, that is a framework bug." visual={<AspectDemo />}>
            <Feature title="One HTML page in, one film out" proof={<Code label="page.html">{PAGE}</Code>}>
              A film is <code>films/&lt;name&gt;/page.html</code> plus its own assets folder. CSS, Web Animations, SVG, canvas and three.js
              all work. There is no private format.
            </Feature>
            <Feature title="Time is the seek" proof={<Code label="window.seek">{SEEK}</Code>}>
              The renderer sets the time of every CSS and Web Animation, and calls <code>window.seek(t)</code> when the page defines one.
              The page paints frame t as a pure function of t.
            </Feature>
            <Feature
              title="Every aspect from one page"
              proof={
                <div className="codeblock">
                  <div className="lbl">core/layout/aspects.js</div>
                  <table className="ft-tab">
                    <tbody>
                      {ASPECTS.map(([a, px]) => (
                        <tr key={a}><th scope="row">{a}</th><td>{px}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            >
              <code>--vw</code> and <code>--vh</code> are set on <code>:root</code> before your scripts run, so CSS lays the page out for each
              canvas. <code>bin/vawe ship --aspect all</code> writes one file per aspect.
            </Feature>
            <Feature title="Every number is a literal" proof={<Code label="studio">{LITERALS}</Code>}>
              A tunable number is a literal in the page: a keyframe stop, a <code>:root</code> custom property, a table row. The studio
              edits those literals in place.
            </Feature>
          </Section>

          <Section id="frames" title="Same frames, every render." lead="The clock is replaced before the page runs." visual={<SeekScrubber src="/examples/showcase.mp4" webm="/examples/showcase.webm" poster="/examples/showcase.webp" />}>
            <Feature
              title="The clock refuses wall time"
              proof={
                <>
                  <Code label="core/engine/page-clock.js">{CLOCK}</Code>
                  <Stat n="5" label="time sources the clock replaces" />
                </>
              }
            >
              A frame is seeked, not played. So the picture at time t is the same whether it renders first or last.{" "}
              <a href="/determinism">How that works, in full</a>.
            </Feature>
            <Feature title="Parallel slices, the same pixels" proof={<Stat n="60" label="frames per slice, for any worker count" />}>
              The renderer captures fixed 60-frame slices at once on one browser. The slice size never follows the worker count, so the
              pixels are identical for any number of workers.
            </Feature>
            <Feature title="A test proves it" proof={<HashProof />}>
              The end-to-end test renders pages twice and compares every frame. The frames must also differ over time, so a frozen page
              fails too.
            </Feature>
            <Feature title="Draft fast, ship at 60\u00a0fps" proof={<Code label="two renders">{RATES}</Code>}>
              Frames are seeked at fractional times, so the render rate is independent of the page. A draft is for a quick look; the final
              mixes the audio and adds motion blur.
            </Feature>
          </Section>

          <Section id="look" title="Light, blur and sound." lead="Set by the renderer and the lens, not per element." visual={<BlurDemo />}>
            <Feature
              title="Blur follows the motion"
              proof={
                <>
                  {fastClip ? (
                    <div className="ft-film">
                      <Clip webm={fastClip.webm} src={fastClip.mp4} poster={fastClip.poster} decorative />
                    </div>
                  ) : null}
                  <Stat n="1–32" label="subframes per frame in a final, set by speed" />
                </>
              }
            >
              A speed pass measures how far things move in each frame: a still frame gets one sample, a fast one enough subframes to blend
              into one streak. The shutter is 180 degrees. A draft has no blur.
            </Feature>
            <Feature
              title="A lens that films the screen"
              proof={
                lensClip ? (
                  <div className="ft-film">
                    <Clip webm={lensClip.webm} src={lensClip.mp4} poster={lensClip.poster} decorative />
                  </div>
                ) : null
              }
            >
              Render the flat screen, then let one shader film it: perspective, depth of field with real bokeh shapes, bloom, LED grid,
              colour fringes, tear and grain. Noise is hashed from the seed and the time, so renders still match.
            </Feature>
            <Feature title="Ten named looks" proof={<ul className="ft-chips" aria-label="Looks">{LOOK_NAMES.map((l) => <li key={l} className="mono">{l}</li>)}</ul>}>
              Compare camera looks on your own page, one labelled grid per second. The look is set from outside; the page is not edited.
            </Feature>
            <Feature title="Sound is mixed offline" proof={<AudioLane />}>
              <code>&lt;audio&gt;</code> tags are never played live. The final render mixes them at their <code>data-at</code> times, and a
              voice-over track ducks a music track.
            </Feature>
          </Section>

          <Section id="library" title="Moves and easing to copy." lead="Each move is markdown an agent reads and a clip you watch." visual={<MoveClips names={["caret-typing", "bracket-callout", "iris-wipe", "camera-moves", "text-on-path", "letter-stagger"]} />}>
            <Feature title={`${MOVES.length} moves in ${GROUPS.length} groups`} proof={<MoveClips names={["caret-typing", "bracket-callout", "iris-wipe", "camera-moves"]} />}>
              Each move is a clip and one markdown file: when to use it, the snippet, the notes and the sound cue.{" "}
              <a href="/moves">Browse the moves</a>.
            </Feature>
            <Feature title={`${EASES.length} easing curves as CSS`} proof={ease ? <Link href="/easing/land" className="panel ft-curve"><Thumb e={ease} /><span className="meta">{ease.name}: cubic-bezier({ease.bezier.params.join(", ")}), {ease.points} linear() points</span></Link> : null}>
              Search the curves, watch one run, and copy its exact <code>linear()</code> string, nearest <code>cubic-bezier()</code>{" "}
              or Web Animations line. <a href="/easing">Browse the curves</a>.
            </Feature>
            <Feature title="15 recipes chain the moves" proof={<Stat n="15" label="film shapes, from a 3 s spectacle to a 22 s demo" />}>
              A recipe orders moves into one film type: a brand sting, a launch, a feature tour, a proof film.{" "}
              <a href="/docs/recipes">Open the recipes</a>.
            </Feature>
          </Section>

          <Section id="loop" title="The loop." lead="A film goes through checks before it ships." visual={<Pipeline />}>
            <Feature title="One command per stage" proof={<Code label="start">{NEW}</Code>}>
              <code>new</code>, <code>dev</code>, <code>strip</code>, <code>critique</code>, <code>ship</code>. Each step names the next.
            </Feature>
            <Feature title="See a film completely" proof={<Code label="look">{SEE}</Code>}>
              <code>see</code> reads a film completely: shots, motion, light, type and sound, with the numbers. The others show one part.
            </Feature>
            <Feature title="Checks name the problem" proof={<Code label="a waiver, with its reason">{WAIVER}</Code>}>
              A draft check names static windows, blank runs, small text and a mix that is too quiet or too loud. A rule can be waived in
              the page, and the waiver has to state where and what was measured, or the render refuses.
            </Feature>
            <Feature title="A fresh session judges" proof={<Code label="critique, judge">{JUDGE}</Code>}>
              A pass is never self-recorded. A critique runs in a session that did not write the page, and the judge scores key frames
              in a fresh one.
            </Feature>
            <Feature title="The owner approves the final" proof={<Code label="approval">{APPROVE}</Code>}>
              <code>ship</code> refuses until the owner approves the full draft. A film session never runs the approval.
            </Feature>
          </Section>

          <Section id="agents" title="Built for coding agents." visual={<MoveFilter moves={MOVES.map(toCard)} groups={GROUPS} />}>
            <Feature title="Skills that carry the contract" proof={<ul className="ft-chips" aria-label="Skills">{SKILLS.split("\n").map((s) => <li key={s} className="mono">{s.replace("skills/", "")}</li>)}</ul>}>
              Five skills cover the brief, the page, the critique, the cuts and a reference match. An agent writes a page from them without
              reading the engine.
            </Feature>
            <Feature title="Recreate a reference" proof={<Code label="match a film">{REF}</Code>}>
              Mark each line of the reference spec keep or change, rebuild, and loop the critique until it passes. <code>ship</code>{" "}
              refuses until it does.
            </Feature>
            <Feature title="Moves an agent can filter" proof={<Code label="moves">{"/moves/index.json\n/moves/<name>.md   // one per move"}</Code>}>
              The move list is plain JSON and each move is markdown, so an agent fetches only what it needs.{" "}
              <a href="/ai-agents">How an agent writes the page</a>.
            </Feature>
          </Section>

          <section className="ft-end" aria-label="A film made with vawe">
            <div className="ft-film">
              <Clip webm="/examples/cindre.webm" src="/examples/cindre.mp4" poster="/examples/cindre.webp" decorative />
            </div>
            <span className="meta">CINDRE, a 10&nbsp;s perfume film. One page, rendered by vawe.</span>
          </section>

          <Next
            title="Start from a move"
            lead="Copy its snippet, then run the loop."
            primary={{ href: REPO_URL, label: "Get started on GitHub" }}
            secondary={{ href: "/moves", label: "See the moves" }}
            related={[
              { href: "/determinism", label: "Why the same page gives the same frames" },
              { href: "/easing", label: "Easing functions as CSS" },
              { href: "/ai-agents", label: "How an agent writes the page" },
            ]}
          />
        </main>
      </div>
      <Footer active="/features" />
    </div>
  );
}
