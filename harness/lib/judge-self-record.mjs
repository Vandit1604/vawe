// harness/lib/judge-self-record.mjs: is the agent recording a PASS right now the SAME AGENT that
// rendered the cut it is judging? Pulled out of quality/gates/judge.mjs so it can be asserted directly
// (that script exits the process on a dozen other conditions the moment it is run, which makes it unsafe
// to import for a unit test) and so nothing else that ever needs "who authored this run" forks a second
// copy of the answer (the ship gate asks the same question of a critique: harness/lib/critique-gate.mjs).
//
// Session alone cannot answer "which agent": a subagent launched via the Agent tool (the fresh judge
// this guard exists to allow, guides/judge.md, "the PASS is not the author's to self-record")
// can inherit the SAME `CLAUDE_CODE_SESSION_ID` as the agent that authored the render, because env vars
// propagate to a spawned child by default (harness/lib/runlog.mjs stamps every run with both).
// Refusing on session alone then refuses the one PASS this guard exists to allow.
//
// A fresh judge runs with VAWE_AGENT=<name> (runlog.mjs namedAgent). Refused only when session and
// agent both match; a side with no name falls back to the session-only test.
import { readRuns, agentId, namedAgent } from './runlog.mjs';

const AUTHORING = new Set(['dev', 'ship']);

/** True when both run records name a session and it is the same one. A VAWE_AGENT label cannot tell two agents of one session apart: any process can set it. */
export const sameSession = (a, b) => Boolean(a.session && b.session && a.session === b.session);

/** True when two run records ({ session, agent }) come from the same session and the same named agent (an unnamed side matches any). */
export function sameIdentity(a, b) {
  const sameSession = !!(a.session && b.session && a.session === b.session);
  const [x, y] = [namedAgent(a.agent), namedAgent(b.agent)];
  return sameSession && (!x || !y || x === y);
}

/** The newest run that rendered the film (a dev or ship record), or undefined. */
export const lastAuthorRun = (runs) => runs.slice().reverse().find((r) => AUTHORING.has(r.cmd) || r.render);

export function selfRecordCheck(inp) {
  const thisSession = process.env.CLAUDE_CODE_SESSION_ID || null;
  const authorRun = lastAuthorRun(readRuns(inp));
  const authorSession = authorRun && authorRun.session;
  return { selfRecorded: sameIdentity({ session: thisSession, agent: agentId() }, { session: authorSession, agent: authorRun?.agent }), thisSession, authorSession };
}
