// mcp/net.mjs. The one guarded way this server fetches a URL a caller influenced.
//
// The tools that reach the network (logo, photo, reflect) are how a stranger points this server at a
// URL. Unguarded, that is a server-side request forgery: a caller asks for a "logo" at
// http://169.254.169.254/ (cloud metadata) or http://localhost:port/ and reads the response back
// through the video or the colour eyedrop. So every outbound fetch resolves the host first and
// refuses any address that is loopback, private, or link-local, and re-checks after each redirect,
// because a public URL can 302 to an internal one.
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 12 << 20;

// A resolved IP that must never be fetched. Covers loopback, RFC1918, link-local (incl. the cloud
// metadata 169.254.169.254), carrier-grade NAT, and the IPv6 equivalents.
function isBlockedIP(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;          // link-local + metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true;          // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    return false;
  }
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')
    || v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.') || v.startsWith('::ffff:169.254');
}

async function assertPublic(hostname) {
  // A literal IP in the URL skips DNS; check it directly. Otherwise resolve and check EVERY answer,
  // so a name with one public and one private A record cannot slip the private one through.
  if (net.isIP(hostname)) {
    if (isBlockedIP(hostname)) throw new Error(`refused: ${hostname} is a private address`);
    return;
  }
  let addrs;
  try {
    const [v4, v6] = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)]);
    addrs = [...(v4.value || []), ...(v6.value || [])];
  } catch {
    throw new Error(`refused: cannot resolve ${hostname}`);
  }
  if (!addrs.length) throw new Error(`refused: ${hostname} did not resolve`);
  for (const ip of addrs) {
    if (isBlockedIP(ip)) throw new Error(`refused: ${hostname} resolves to a private address (${ip})`);
  }
}

/** Fetch a caller-influenced URL safely. Returns a Buffer, or throws with a caller-safe reason. */
export async function safeFetch(rawUrl) {
  let url = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let u;
    try { u = new URL(url); } catch { throw new Error('refused: not a valid URL'); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`refused: ${u.protocol} is not allowed`);
    await assertPublic(u.hostname);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(u, { redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'vawe-mcp' } });
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      // Re-guard the redirect target against this same host, resolving relative locations.
      url = new URL(res.headers.get('location'), u).toString();
      continue;
    }
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error(`refused: response too large (${(buf.length / 1e6).toFixed(1)}MB)`);
    return buf;
  }
  throw new Error('refused: too many redirects');
}
