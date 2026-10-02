export type Source = { label: string; url: string };
export type Row = { feature: string; them: string; vawe: string };
export type Qa = { q: string; a: string };

export type Rival = {
  slug: string;
  name: string;
  read: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  what: string;
  stronger: string[];
  chooseThem: string[];
  chooseVawe: string[];
  rows: Row[];
  faq: Qa[];
  sources: Source[];
  related: { href: string; label: string }[];
};

const READ = "2026-10-03";

export const VAWE_SOURCES: Source[] = [
  { label: "Vawe README", url: "https://github.com/Vandit1604/vawe#readme" },
  { label: "Vawe LICENSE", url: "https://github.com/Vandit1604/vawe/blob/main/LICENSE" },
];

export const RIVALS: Rival[] = [
  {
    slug: "remotion",
    name: "Remotion",
    read: READ,
    metaTitle: "Vawe vs Remotion: React code or one HTML page",
    metaDescription:
      "Remotion builds video from React components under a source-available licence. Vawe renders one HTML page under Apache-2.0. A fact-checked comparison of authoring, rendering, licence and agent support.",
    h1: "Vawe vs Remotion.",
    intro:
      "Remotion makes video from React components. Vawe makes video from one HTML page. Both render in headless Chrome. This page compares them on authoring, rendering, licence and agent support, and says where Remotion is stronger.",
    what:
      "Remotion is a framework to make videos programmatically with React. You write components, preview them in Remotion Studio, and render with Remotion locally or on AWS Lambda or Google Cloud Run.",
    stronger: [
      "Community and history. The Remotion site lists more than 5 million monthly npm installs and 10,000 Discord members, and the GitHub repo shows about 61,600 stars. Vawe became public on 2026-09-16.",
      "Distributed rendering. Remotion Lambda splits a render across several functions and stitches the result. Vawe renders on one machine.",
      "A React model. If your team already writes React, components, props and a Player you can embed in an app come with it.",
      "Documentation volume. The site lists about 1,000 documentation pages.",
    ],
    chooseThem: [
      "Your team already writes React and wants video in the same component model.",
      "You need to render many videos in parallel on AWS Lambda or Cloud Run.",
      "You want an embeddable Player, or a drag-and-drop Studio that writes back to code.",
      "You are in a group that fits the free licence, or you can buy a company licence.",
    ],
    chooseVawe: [
      "You want an agent to write the film in plain HTML, CSS and Web Animations, with no framework to learn.",
      "Your company has more than 3 employees and you want a licence with no size or per-render terms.",
      "You want one page to render to the same frames every time, with the clock, timers and Math.random controlled for you.",
      "You want built-in motion blur, dither and a library of 94 moves with After Effects eases.",
    ],
    rows: [
      { feature: "What it is", them: "Framework to make videos with React", vawe: "Framework to make films from one HTML page" },
      { feature: "Authoring model", them: "React components", vawe: "One HTML page: CSS, Web Animations, SVG, canvas, three.js" },
      { feature: "Rendering", them: "Headless Chromium frames, encoded with FFmpeg; local, AWS Lambda or Cloud Run", vawe: "Headless Chrome seeks and screenshots each frame; renders on your machine" },
      { feature: "Licence", them: "Source-available Remotion License: free for individuals, for-profit companies up to 3 employees, non-profits and evaluation; Company License above that", vawe: "Apache-2.0, no company-size clause" },
      { feature: "Pricing, company use", them: "$100 a month minimum for Automators ($0.01 per render) or $25 a month per seat for Creators, with 3 seats minimum", vawe: "Free" },
      { feature: "Agent support", them: "Agent Skills (npx skills add remotion-dev/skills); docs served as Markdown", vawe: "bin/vawe CLI and skills for writing, critiquing and judging a film" },
      { feature: "Editor", them: "Remotion Studio, with drag-and-drop that saves to code", vawe: "No timeline editor: the page is the film" },
      { feature: "Distributed rendering", them: "Yes: Lambda and Cloud Run", vawe: "No" },
    ],
    faq: [
      {
        q: "Is Remotion free?",
        a: "It is free for an individual, a for-profit organisation with up to 3 employees, a non-profit, and evaluation for possible commercial use. A larger for-profit company needs a Company License. Vawe has no such threshold.",
      },
      {
        q: "Can I use Remotion with an AI agent?",
        a: "Yes. Remotion publishes Agent Skills that install with npx skills add remotion-dev/skills, and serves its docs as Markdown for agents.",
      },
      {
        q: "Do I need to know React to use Vawe?",
        a: "No. A Vawe film is one HTML page. You write HTML, CSS and Web Animations, or SVG, canvas or three.js, and the renderer seeks the page frame by frame.",
      },
      {
        q: "Is a Vawe render the same every time?",
        a: "Yes. A virtual clock owns Date, requestAnimationFrame, timers and Math.random, and tests check that two renders give identical frames.",
      },
      {
        q: "Can Vawe render on AWS Lambda?",
        a: "No. Vawe renders on your own machine. If you need distributed rendering, Remotion is the stronger choice today.",
      },
    ],
    sources: [
      { label: "Remotion README", url: "https://github.com/remotion-dev/remotion" },
      { label: "Remotion LICENSE.md", url: "https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md" },
      { label: "Remotion licence pricing", url: "https://www.remotion.pro/license" },
      { label: "Remotion Lambda docs", url: "https://www.remotion.dev/docs/lambda" },
      { label: "Remotion Agent Skills docs", url: "https://www.remotion.dev/docs/ai/skills" },
      { label: "Remotion site", url: "https://www.remotion.dev/" },
    ],
    related: [
      { href: "/remotion-alternatives", label: "Remotion alternatives, categorized" },
      { href: "/vs/hyperframes", label: "Vawe vs HyperFrames" },
    ],
  },
  {
    slug: "hyperframes",
    name: "HyperFrames",
    read: READ,
    metaTitle: "Vawe vs HyperFrames: two HTML-to-video engines",
    metaDescription:
      "HyperFrames and Vawe both render HTML to MP4 under Apache-2.0 with an agent in mind. They differ in timing, determinism and ecosystem. A fact-checked comparison, including where HyperFrames is stronger.",
    h1: "Vawe vs HyperFrames.",
    intro:
      "HyperFrames is HeyGen's open-source framework for rendering HTML to video. It is Vawe's closest peer: Apache-2.0, headless Chrome, and a pitch aimed at agents. This page lists the differences that remain.",
    what:
      "HyperFrames turns HTML, CSS, media and seekable animations into MP4. A composition is plain HTML with data attributes for timing and tracks, animated by GSAP, CSS, Lottie, Three.js, Anime.js or the Web Animations API.",
    stronger: [
      "Ecosystem. The HyperFrames repo shows about 55,900 stars and ships 21 installable skills, a Studio browser editor and a catalog of reusable blocks such as transitions, overlays and charts.",
      "Render targets. Its docs list local, AWS Lambda, Google Cloud Run and HeyGen cloud rendering. Vawe renders on one machine.",
      "Ready workflows. Its skills include product-launch-video, faceless-explainer, pr-to-video and music-to-video.",
      "Time in market. Vawe became public on 2026-09-16.",
    ],
    chooseThem: [
      "You want a block catalog and a browser Studio to start from.",
      "You want cloud rendering on Lambda, Cloud Run or HeyGen.",
      "You like GSAP timelines and data-attribute timing in the HTML.",
      "You want skills for a named workflow such as a launch video or a PR video.",
    ],
    chooseVawe: [
      "You want ordinary web code to keep working: Vawe replaces Date, timers and Math.random with seek-driven versions, where HyperFrames forbids them.",
      "You want timing from CSS keyframes, element.animate() or a seek(t) function, with no timing attributes in the markup.",
      "You want built-in adaptive motion blur and a library of 94 moves with After Effects eases.",
      "You want a film judged by a fresh session that did not write it.",
    ],
    rows: [
      { feature: "What it is", them: "Open-source framework: HTML to deterministic MP4", vawe: "Framework to make films from one HTML page" },
      { feature: "Authoring model", them: "HTML with data attributes for timing and tracks; GSAP, CSS, Lottie, Three.js, Anime.js, WAAPI", vawe: "One HTML page timed by CSS keyframes, element.animate() or window.seek(t)" },
      { feature: "Rendering", them: "Headless Chrome seeks each frame, FFmpeg encodes; local, Lambda, Cloud Run, HeyGen cloud", vawe: "Headless Chrome seeks and screenshots each frame; renders on your machine" },
      { feature: "Determinism", them: "Forbids Date.now, requestAnimationFrame, system timers and unseeded Math.random in a composition", vawe: "A virtual clock replaces those calls with functions of the seek time" },
      { feature: "Licence", them: "Apache-2.0", vawe: "Apache-2.0" },
      { feature: "Agent support", them: "21 skills, a /hyperframes router skill, non-interactive CLI defaults", vawe: "bin/vawe CLI and skills; a separate session critiques and judges the film" },
      { feature: "Editor", them: "Studio browser editor and a block catalog", vawe: "No timeline editor: the page is the film" },
      { feature: "Distributed rendering", them: "Yes: Lambda, Cloud Run, HeyGen cloud", vawe: "No" },
    ],
    faq: [
      {
        q: "Are HyperFrames and Vawe both open source?",
        a: "Yes. Both are Apache-2.0. Neither has a company-size clause in the licence.",
      },
      {
        q: "How do they keep renders deterministic?",
        a: "HyperFrames states a rule: no Date.now, requestAnimationFrame or system timers, and no Math.random without a seed. Vawe lets a page call them, and replaces them with functions of the seek time before any page script runs.",
      },
      {
        q: "Which one has more templates and blocks?",
        a: "HyperFrames. It ships a block catalog and a template gallery. Vawe ships 94 moves and film templates in its prompts folder.",
      },
      {
        q: "Does Vawe have cloud rendering?",
        a: "No. Vawe renders on your machine. HyperFrames lists local, AWS Lambda, Google Cloud Run and HeyGen cloud rendering. Its hosted price is not public, so this page gives none.",
      },
    ],
    sources: [
      { label: "HyperFrames README", url: "https://github.com/heygen-com/hyperframes" },
      { label: "HyperFrames README (raw)", url: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/README.md" },
      { label: "HyperFrames introduction", url: "https://hyperframes.heygen.com/introduction" },
      { label: "HyperFrames determinism", url: "https://hyperframes.heygen.com/concepts/determinism" },
      { label: "HyperFrames vs Remotion guide", url: "https://hyperframes.heygen.com/guides/hyperframes-vs-remotion.md" },
    ],
    related: [
      { href: "/hyperframes-alternatives", label: "HyperFrames alternatives" },
      { href: "/vs/remotion", label: "Vawe vs Remotion" },
      { href: "/determinism", label: "How Vawe keeps renders deterministic" },
    ],
  },
  {
    slug: "motion-canvas",
    name: "Motion Canvas",
    read: READ,
    metaTitle: "Vawe vs Motion Canvas: generator functions or HTML",
    metaDescription:
      "Motion Canvas animates vector scenes with TypeScript generator functions and an editor. Vawe renders one HTML page. A fact-checked comparison of authoring, rendering, licence and agent support.",
    h1: "Vawe vs Motion Canvas.",
    intro:
      "Motion Canvas is a TypeScript library for vector animation, with a real-time editor. Vawe renders one HTML page to a film. They suit different work, and this page says which.",
    what:
      "Motion Canvas is a TypeScript library that uses generator functions to program animations, plus an editor with a real-time preview. It targets informative vector animation synced to a voice-over.",
    stronger: [
      "A purpose-built editor. It gives a real-time preview and audio sync for scenes you write in code.",
      "A flow model for diagrams. Generators describe what happens step by step, with duration and speed instead of hard-coded keyframes.",
      "Licence and age. It is MIT-licensed and has about 19,200 GitHub stars.",
    ],
    chooseThem: [
      "You make explainer or diagram animation synced to a voice-over.",
      "You like writing animation as TypeScript generators with a live preview.",
      "You want an MIT licence.",
      "Your scenes are vector shapes and text, not web pages or video clips.",
    ],
    chooseVawe: [
      "You want to use the whole web platform: HTML, CSS, SVG, canvas and three.js, not one scene API.",
      "You want an AI agent to write the film in code it already knows.",
      "You want one command that renders the final MP4 with motion blur and an audio mix.",
      "You want to place video clips and CSS layouts in the film.",
    ],
    rows: [
      { feature: "What it is", them: "TypeScript library and editor for vector animation", vawe: "Framework to make films from one HTML page" },
      { feature: "Authoring model", them: "TypeScript generator functions that describe the animation step by step", vawe: "One HTML page: CSS, Web Animations, SVG, canvas, three.js" },
      { feature: "Rendering", them: "Editor renders an image sequence to /output; an FFmpeg exporter makes a video", vawe: "Headless Chrome seeks and screenshots each frame; encodes one MP4 with the page's audio" },
      { feature: "Licence", them: "MIT", vawe: "Apache-2.0" },
      { feature: "Agent support", them: "None found in its official docs or site", vawe: "bin/vawe CLI and skills for writing, critiquing and judging a film" },
      { feature: "Editor", them: "Web editor with real-time preview and audio sync", vawe: "No timeline editor: the page is the film" },
      { feature: "Release history", them: "Latest stable on its releases page: v3.17.2, 2024-12-14", vawe: "Public since 2026-09-16" },
    ],
    faq: [
      {
        q: "What is a generator function in Motion Canvas?",
        a: "It is a TypeScript function that yields as time passes. You write what should happen step by step, and the library plays it. The Motion Canvas docs describe the focus as duration, speed and acceleration instead of hard-coded keyframes.",
      },
      {
        q: "How does Motion Canvas make a video file?",
        a: "The editor can save each frame as an image to an output folder. A separate FFmpeg exporter can make a finished video. Its docs mark the exporter as a relatively new feature.",
      },
      {
        q: "Can an AI agent use Motion Canvas?",
        a: "You can ask an agent to write the TypeScript. This page found no agent skills or agent docs on the official Motion Canvas site.",
      },
      {
        q: "Is Motion Canvas open source?",
        a: "Yes, under the MIT licence. Vawe is Apache-2.0.",
      },
    ],
    sources: [
      { label: "Motion Canvas README", url: "https://github.com/motion-canvas/motion-canvas" },
      { label: "Motion Canvas site", url: "https://motioncanvas.io/" },
      { label: "Motion Canvas rendering docs", url: "https://motioncanvas.io/docs/rendering" },
      { label: "Motion Canvas video exporter", url: "https://motioncanvas.io/docs/rendering/video" },
      { label: "Motion Canvas releases", url: "https://github.com/motion-canvas/motion-canvas/releases" },
    ],
    related: [
      { href: "/vs/remotion", label: "Vawe vs Remotion" },
      { href: "/vs/lottie", label: "Vawe vs Lottie" },
    ],
  },
  {
    slug: "lottie",
    name: "Lottie",
    read: READ,
    metaTitle: "Vawe vs Lottie: a playback format or a film renderer",
    metaDescription:
      "Lottie is a JSON format for vector animation, exported from After Effects and played in apps. Vawe renders one HTML page to MP4. A fact-checked comparison of authoring, rendering and licence.",
    h1: "Vawe vs Lottie.",
    intro:
      "Lottie is a file format for vector animation that apps play at run time. Vawe renders a film to MP4. They overlap only when you want a Lottie animation as video. This page explains the line between them.",
    what:
      "Lottie is an open-source vector animation file format, first made in 2015 as an export format for Adobe After Effects. A player draws the JSON in an app or on the web. It is not a video renderer.",
    stronger: [
      "Playback in products. One Lottie file plays on the web, iOS, Android and embedded devices, and can react to clicks and hover.",
      "File size. The dotLottie container compresses animations and shares assets.",
      "A standard. The format has a spec, a validator and a list of implementations, and a non-profit community hosted by the Linux Foundation.",
      "Reach. The lottie-web repo shows about 32,100 stars.",
    ],
    chooseThem: [
      "You ship an animated icon, loader or illustration inside an app or web page.",
      "A motion designer works in After Effects and exports with Bodymovin.",
      "You need the animation to stay small and interactive at run time.",
      "You do not need video, audio or arbitrary HTML in the animation.",
    ],
    chooseVawe: [
      "You want an MP4 film, with audio, from a page you can write in code.",
      "You need HTML layout, text, video clips, canvas or three.js in the same film.",
      "You want an agent to write the file in web code it already knows.",
      "You want motion blur and the same frames on every render.",
    ],
    rows: [
      { feature: "What it is", them: "Open vector animation file format with players", vawe: "Framework to make films from one HTML page" },
      { feature: "Authoring model", them: "JSON exported from After Effects with Bodymovin, or made in LottieFiles Creator", vawe: "One HTML page: CSS, Web Animations, SVG, canvas, three.js" },
      { feature: "Rendering", them: "A runtime player draws it (lottie-web: SVG, Canvas, HTML); not an MP4 renderer", vawe: "Headless Chrome seeks and screenshots each frame; encodes one MP4" },
      { feature: "Licence", them: "lottie-web and dotlottie-web: MIT; the spec: Community Specification License 1.0", vawe: "Apache-2.0" },
      { feature: "Agent support", them: "LottieFiles offers a Creator MCP server and a hosted MCP server", vawe: "bin/vawe CLI and skills for writing, critiquing and judging a film" },
      { feature: "Content it can hold", them: "Vector shapes and animation", vawe: "Anything a browser draws, plus audio" },
    ],
    faq: [
      {
        q: "Can Lottie export to MP4?",
        a: "The Lottie players do not make MP4. LottieFiles lists MP4, WebM and GIF among the export formats of its own tools. Vawe renders MP4 from an HTML page directly.",
      },
      {
        q: "Is Lottie the same as After Effects?",
        a: "No. Lottie is a file format. It was first made as an export format for After Effects, and Bodymovin is the plugin that exports it.",
      },
      {
        q: "Can I use a Lottie animation inside a Vawe film?",
        a: "Vawe pages can use any web library, but this page has not tested a Lottie player with the seek clock, so it makes no claim.",
      },
      {
        q: "Is Lottie free?",
        a: "The formats and players are MIT-licensed. LottieFiles plan prices are not stated here because the pricing page did not load when this page was written.",
      },
    ],
    sources: [
      { label: "Lottie community site", url: "https://lottie.github.io/" },
      { label: "lottie-web", url: "https://github.com/airbnb/lottie-web" },
      { label: "Lottie spec", url: "https://lottie.github.io/lottie-spec/latest/" },
      { label: "dotLottie", url: "https://dotlottie.io/" },
      { label: "dotlottie-web", url: "https://github.com/LottieFiles/dotlottie-web" },
      { label: "LottieFiles Creator MCP", url: "https://docs.lottiefiles.com/en/creator/13_ai-tools/lottie-creator-mcp" },
      { label: "LottieFiles MCP", url: "https://docs.lottiefiles.com/en/platform/mcp" },
      { label: "LottieFiles export help", url: "https://help.lottiefiles.com/hc/en-us/articles/29062996652057-troubleshooting-exporting-lottie-animations-as-gif-or-mp4-files" },
    ],
    related: [
      { href: "/vs/motion-canvas", label: "Vawe vs Motion Canvas" },
      { href: "/vs/remotion", label: "Vawe vs Remotion" },
    ],
  },
];

export const RIVAL_BY_SLUG = Object.fromEntries(RIVALS.map((r) => [r.slug, r]));
