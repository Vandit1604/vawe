// Plain words for a move, with no data import, so a client component can use them.

// The noun a searcher uses for each group, so a title says what the move is, not how the README sorts it.
export const GROUP_NOUN: Record<string, string> = {
  "reveal-a-title": "text reveal",
  "change-between-shots": "transition",
  "point-the-eye": "highlight",
  "move-the-camera": "camera move",
  "end-a-film": "end card",
  "product-moments": "product UI",
  grounds: "background",
};

export const groupNoun = (group: string | null) => GROUP_NOUN[group ?? ""] ?? "motion";

export const moveAlt = (m: { title: string; group: string | null }) => `${m.title}: final frame of the ${groupNoun(m.group)} animation`;
