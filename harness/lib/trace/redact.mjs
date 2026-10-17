const SECRETS = [
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}/g,
  /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{16,}/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /(\b(?:api[_-]?key|token|secret|passw(?:or)?d|authorization)["']?\s*[=:]\s*["']?)[^\s"'&]{6,}/gi,
  /(--(?:token|key|password|secret)[= ])\S+/gi,
  /\b[A-Za-z0-9+/_-]{40,}={0,2}/g,
];

const keepsLead = (match, lead) => typeof lead === 'string' && match.startsWith(lead) && lead.length < match.length;
const isPath = (text) => /^[\w./~@-]+$/.test(text) && text.includes('/');

/** The text with every key, token and long opaque string replaced by [redacted]; a long path stays. Pure. */
export function redact(text) {
  let out = String(text);
  for (const re of SECRETS) {
    out = out.replace(re, (m, lead) => {
      if (keepsLead(m, lead)) return `${lead}[redacted]`;
      return isPath(m) ? m : '[redacted]';
    });
  }
  return out;
}

/** One line of at most `max` chars, redacted. Pure. */
export const brief = (text, max = 140) => redact(String(text ?? '').replace(/\s+/g, ' ').trim()).slice(0, max);
