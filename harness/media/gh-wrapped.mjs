import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const login = argv.find((a) => !a.startsWith('--'));
if (!login) { console.error('usage: node harness/media/gh-wrapped.mjs <login> [--from YYYY-MM-DD] [--to YYYY-MM-DD]'); process.exit(2); }
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const to = opt('--to', new Date().toISOString().slice(0, 10));
const from = opt('--from', new Date(new Date(to).getTime() - 365 * 864e5).toISOString().slice(0, 10));

const gh = (args) => JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 << 20 }));

const Q = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){
  login name createdAt followers{totalCount}
  contributionsCollection(from:$from,to:$to){
    totalCommitContributions totalPullRequestContributions totalIssueContributions
    totalPullRequestReviewContributions totalRepositoryContributions restrictedContributionsCount
    contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount weekday } } }
    commitContributionsByRepository(maxRepositories:25){
      repository{ nameWithOwner isPrivate primaryLanguage{name} stargazerCount owner{login} }
      contributions{ totalCount } } } }}`;

const qf = path.join('/tmp', `ghw-${process.pid}.graphql`);
fs.writeFileSync(qf, Q);
const user = gh(['api', 'graphql', '-F', `login=${login}`, '-F', `from=${from}T00:00:00Z`,
  '-F', `to=${to}T00:00:00Z`, '-F', `query=@${qf}`]).data.user;
fs.rmSync(qf, { force: true });

const C = user.contributionsCollection;
const days = C.contributionCalendar.weeks.flatMap((w) => w.contributionDays);

const active = days.filter((d) => d.contributionCount > 0);
const peak = days.reduce((a, b) => (b.contributionCount > a.contributionCount ? b : a), days[0]);
let streak = 0, best = 0, bestEnd = null;
for (const d of days) {
  if (d.contributionCount > 0) { streak++; if (streak > best) { best = streak; bestEnd = d.date; } } else streak = 0;
}
const byMonth = {};
for (const d of days) byMonth[d.date.slice(0, 7)] = (byMonth[d.date.slice(0, 7)] || 0) + d.contributionCount;
const months = Object.entries(byMonth).sort();
let qRun = 0, qBest = 0, qFrom = null, qTo = null, runStart = null;
for (const [m, n] of months) {
  if (n <= 5) { if (!qRun) runStart = m; qRun++; if (qRun > qBest) { qBest = qRun; qFrom = runStart; qTo = m; } } else qRun = 0;
}
const repos = C.commitContributionsByRepository
  .map((r) => ({ name: r.repository.nameWithOwner, own: r.repository.owner.login === user.login,
    priv: r.repository.isPrivate, stars: r.repository.stargazerCount, n: r.contributions.totalCount }))
  .sort((a, b) => b.n - a.n);

const pf = path.join('/tmp', `ghw-pr-${process.pid}.graphql`);
fs.writeFileSync(pf, `query($login:String!){user(login:$login){pullRequests(first:60,states:MERGED,
  orderBy:{field:CREATED_AT,direction:DESC}){nodes{title mergedAt additions deletions
  repository{nameWithOwner stargazerCount owner{login}}}}}}`);
const prsRaw = (() => {
  for (let a = 1; ; a++) {
    try { return gh(['api', 'graphql', '-F', `login=${login}`, '-F', `query=@${pf}`]); }
    catch (e) { if (a >= 3) throw e; execFileSync('sleep', ['2']); }
  }
})();
fs.rmSync(pf, { force: true });
const prs = prsRaw.data.user.pullRequests.nodes
  .filter((p) => p.repository.owner.login !== user.login && p.mergedAt >= from && p.mergedAt <= `${to}T23:59:59Z`)
  .sort((a, b) => b.repository.stargazerCount - a.repository.stargazerCount);
const far = prs[0] || null;

const counts = active.map((d) => d.contributionCount).sort((a, b) => a - b);
const q = (p) => counts[Math.floor(counts.length * p)] || 1;
const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
const level = (n) => (n === 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);
const CELL = 15, GAP = 4, weeks = C.contributionCalendar.weeks;
const W = weeks.length * (CELL + GAP), H = 7 * (CELL + GAP);
const firstLoud = (() => { const i = months.findIndex(([m]) => m === qTo); return (months[i + 1] || months[months.length - 1])[0]; })();
const cells = weeks.map((w, x) => w.contributionDays.map((d) => {
  const lv = level(d.contributionCount);
  const lit = d.date.slice(0, 7) >= firstLoud;
  return `<rect class="c l${lv}${lit ? ' lit' : ' dim'}" x="${x * (CELL + GAP)}" y="${d.weekday * (CELL + GAP)}" `
    + `width="${CELL}" height="${CELL}" rx="3" data-d="${d.date}" data-n="${d.contributionCount}"/>`;
}).join('')).join('');
// scene does not also do. See engine-doctrine/MISTAKES.md #384.
const heat = `<div style="width:100%">
<svg viewBox="0 0 ${W} ${H}" width="100%" style="overflow:visible;display:block">
<style>
 /* hyphenated: the palette KEY is surface2, the TOKEN core/boot.js sets is --surface-2. Written wrong
    here first, and the fragment preview could not have caught it while it applied no tokens (#368). */
 .c{fill:var(--surface-2)}
 .l1{fill:var(--accent);fill-opacity:0.28}
 .l2{fill:var(--accent);fill-opacity:0.52}
 .l3{fill:var(--accent);fill-opacity:0.76}
 .l4{fill:var(--accent);fill-opacity:1}
</style>${cells}</svg></div>`;

fs.mkdirSync('assets/gen', { recursive: true });
fs.mkdirSync('films/scene/_data', { recursive: true });
const heatPath = `assets/gen/gh-heat-${login}.html`;
fs.writeFileSync(heatPath, heat);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mname = (ym) => MON[+ym.slice(5, 7) - 1];
const nice = (d) => `${+d.slice(8, 10)} ${mname(d.slice(0, 7))}`;
const niceY = (d) => `${nice(d)} ${d.slice(0, 4)}`;
const row = {
  name: `gh-wrapped-${login}`,
  login: user.login,
  total: C.contributionCalendar.totalContributions,
  commits: C.totalCommitContributions,
  prs: C.totalPullRequestContributions,
  newrepos: C.totalRepositoryContributions,
  activedays: active.length,
  totaldays: days.length,
  quietmonths: qBest,
  quietfrom: mname(qFrom), quietto: mname(qTo),
  loudmonth: mname(firstLoud), loudcount: byMonth[firstLoud],
  peakmonth: mname(months.reduce((a, b) => (b[1] > a[1] ? b : a))[0]),
  peakmonthcount: months.reduce((a, b) => (b[1] > a[1] ? b : a))[1],
  streak: best, streakend: nice(bestEnd),
  peakday: nice(peak.date), peakcount: peak.contributionCount,
  repo1: repos[0]?.name.split('/')[1] ?? '', repo1n: repos[0]?.n ?? 0,
  repo2: repos[1]?.name.split('/')[1] ?? '', repo2n: repos[1]?.n ?? 0,
  repo3: repos[2]?.name.split('/')[1] ?? '', repo3n: repos[2]?.n ?? 0,
  farrepo: far ? far.repository.nameWithOwner.split('/')[1] : '',
  farowner: far ? far.repository.owner.login : '',
  farstars: far ? far.repository.stargazerCount : 0,
  faradds: far ? far.additions : 0, fardels: far ? far.deletions : 0,
  farwhen: far ? nice(far.mergedAt.slice(0, 10)) : '',
  fartitle: far ? far.title : '',
  heat: heatPath,
  from: niceY(from), to: niceY(to),
};
fs.writeFileSync('films/scene/_data/gh-wrapped.json', JSON.stringify([row], null, 2));

console.log(`gh-wrapped · ${login} · ${from} → ${to}`);
console.log(`  ${row.total} contributions · ${row.activedays}/${row.totaldays} active days`);
console.log(`  quiet: ${row.quietmonths} months (${row.quietfrom}–${row.quietto}) → ${row.loudmonth} ${row.loudcount}`);
console.log(`  streak ${row.streak}d to ${row.streakend} · peak ${row.peakcount} on ${row.peakday}`);
console.log(`  top: ${row.repo1} ${row.repo1n} · ${row.repo2} ${row.repo2n} · ${row.repo3} ${row.repo3n}`);
console.log(`  furthest: +${row.faradds}/-${row.fardels} into ${row.farowner}/${row.farrepo} (${row.farstars}★) ${row.farwhen}`);
console.log(`  → films/scene/_data/gh-wrapped.json · ${heatPath}`);
