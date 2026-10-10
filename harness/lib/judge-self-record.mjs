// harness/lib/judge-self-record.mjs: is the agent recording a PASS right now the SAME AGENT that
// rendered the cut it is judging? Pulled out of quality/gates/judge.mjs so it can be asserted directly
// (that script exits the process on a dozen other conditions the moment it is run, which makes it unsafe
// to import for a unit test) and so nothing else that ever needs "who authored this run" forks a second
// copy of the answer.
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

export function selfRecordCheck(inp) {
  const thisSession = process.env.CLAUDE_CODE_SESSION_ID || null;
  const thisAgent = namedAgent(agentId());
  const authorRun = readRuns(inp).slice().reverse().find((r) => AUTHORING.has(r.cmd) || r.render);
  const authorSession = authorRun && authorRun.session;
  const authorAgent = namedAgent(authorRun?.agent);
  const sameSession = !!(thisSession && authorSession && thisSession === authorSession);
  const sameAgent = !thisAgent || !authorAgent || thisAgent === authorAgent;
  return { selfRecorded: sameSession && sameAgent, thisSession, authorSession };
}
