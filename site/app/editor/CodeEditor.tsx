"use client";
import { useEffect, useRef } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  syntaxHighlighting,
  HighlightStyle,
  foldGutter,
  foldKeymap,
  codeFolding,
  bracketMatching,
  indentOnInput,
} from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { tags as t } from "@lezer/highlight";

/* The scene editor.
 *
 * It was a <textarea>, which can never fold: folding means collapsing a range of the document to a
 * widget, and a textarea has one opaque string and no view layer to collapse. Scenes here run to
 * 900+ lines (the films), so navigating one meant scrolling past every layer you were not editing.
 * CodeMirror 6 brings a real view layer, and only the parts we use: json, folding, history,
 * bracket matching. No autocomplete, no search panel, no lint, no basicSetup grab-bag.
 *
 * TWO COLOURS, per The One Voice Rule. Not a rainbow theme: cobalt marks the keys (the schema, the
 * part that is Vawe's vocabulary) and everything else is a step on the grey ramp. That is the same
 * mapping the proof diagrams use, so the JSON on this page and the JSON drawn in the diagram on the
 * homepage are coloured by one idea rather than two.
 */

const hl = HighlightStyle.define([
  // the keys ARE the vocabulary, so they carry the brightest ink; the accent stays for the cursor
  { tag: t.propertyName, color: "var(--ink)", fontWeight: "600" },
  { tag: [t.bool, t.null], color: "var(--ink)" },
  // values sit on the grey ramp, weight carries the difference rather than hue
  { tag: t.string, color: "var(--ink-2)" },
  { tag: t.number, color: "var(--ink)" },
  // structure recedes: you read past braces, you do not read them
  { tag: [t.punctuation, t.separator, t.brace, t.squareBracket], color: "var(--muted)" },
  { tag: t.invalid, color: "var(--bad)" },
]);

const theme = EditorView.theme({
  // The ground is a TOKEN, not #fff, matching every colour above it.
  "&": { fontSize: "12.5px", backgroundColor: "var(--surface)", color: "var(--ink-2)", height: "100%" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono), monospace",
    lineHeight: "1.7",
    overflow: "auto",
  },
  ".cm-content": { padding: "12px 0", caretColor: "var(--accent)" },
  ".cm-line": { padding: "0 14px 0 6px" },
  ".cm-gutters": {
    backgroundColor: "var(--surface)",
    border: "none",
    color: "var(--muted)",
    fontFamily: "var(--font-mono), monospace",
    fontSize: "11px",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 6px 0 12px", minWidth: "26px" },
  ".cm-activeLine": { backgroundColor: "var(--accent-soft)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--accent-soft)", color: "var(--ink)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "1.5px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--accent-soft)",
  },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "var(--accent-soft)",
    outline: "1px solid var(--accent-line)",
    color: "inherit",
  },
  ".cm-nonmatchingBracket": { color: "var(--bad)" },
  /* Cobalt at rest, not on hover. These were --line-2 and measured 1.38:1: the one control that IS
     this editor's headline feature was all but invisible, and SC 1.4.11 wants 3:1 for a graphic
     that identifies a control. It is also the same collision the site had elsewhere — a chevron
     drawn like the inert line number beside it. Cobalt says "this does something"; the line
     numbers stay muted because they do not. 5.17:1. */
  ".cm-foldGutter .cm-gutterElement": { padding: "0 2px", cursor: "pointer", color: "var(--ink-2)" },
  ".cm-foldGutter .cm-gutterElement:hover": { color: "var(--ink)" },
  // the collapsed stand-in. It says HOW MUCH is hidden, because "…" alone tells you nothing about
  // whether you just folded away two lines or two hundred.
  ".cm-foldPlaceholder": {
    background: "var(--raised)",
    border: "1px solid transparent",
    borderRadius: "5px",
    color: "var(--ink-2)",
    fontFamily: "var(--font-mono), monospace",
    fontSize: "11px",
    padding: "0 7px",
    margin: "0 2px",
    cursor: "pointer",
  },
});

/** chevrons, drawn, so the gutter matches the site rather than shipping CodeMirror's default glyphs */
function chevron(open: boolean) {
  const el = document.createElement("span");
  el.setAttribute("aria-hidden", "true");
  el.style.display = "inline-flex";
  el.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
    style="transform:rotate(${open ? 90 : 0}deg);transition:transform .15s"><path d="M9 6l6 6-6 6"/></svg>`;
  return el;
}

export function CodeEditor({
  value,
  onChange,
  viewRef,
  describedBy,
}: {
  value: string;
  onChange: (v: string) => void;
  viewRef?: { current: EditorView | null };
  /** id of the element stating how to leave the editor — `indentWithTab` below makes Tab a trap
      otherwise, and a hint only sighted users can read is half a fix. */
  describedBy?: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  // onChange is read through a ref so a new closure each render does not tear down the editor
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const extensions: Extension[] = [
      lineNumbers(),
      codeFolding({
        placeholderDOM: (_v, onclick) => {
          const el = document.createElement("span");
          el.className = "cm-foldPlaceholder";
          el.textContent = "…";
          el.title = "Click to unfold";
          el.onclick = onclick;
          return el;
        },
      }),
      foldGutter({ markerDOM: chevron }),
      history(),
      bracketMatching(),
      indentOnInput(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      json(),
      syntaxHighlighting(hl),
      theme,
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        "aria-label": "Scene JSON",
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) cb.current(u.state.doc.toString());
      }),
    ];
    const v = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: host.current,
    });
    view.current = v;
    if (viewRef) viewRef.current = v;
    return () => {
      v.destroy();
      view.current = null;
      if (viewRef) viewRef.current = null;
    };
    // built once: `value` is pushed in below, and rebuilding on every keystroke would lose the
    // cursor, the selection and the whole undo history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* External changes only (loading a preset). When the user types, the parent's value already
     equals the doc, so this never fires and never fights the cursor. */
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const cur = v.state.doc.toString();
    if (cur === value) return;
    v.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
  }, [value]);

  return <div className="ed-cm" ref={host} />;
}
