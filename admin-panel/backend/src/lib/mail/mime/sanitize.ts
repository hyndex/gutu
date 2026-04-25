/** HTML sanitizer for incoming email bodies.
 *
 *  This is a defensive allow-list sanitizer: only known-safe tags and
 *  attributes survive. Everything else is dropped. Protocols restricted
 *  to http/https/mailto/cid. Inline JS/event handlers stripped. CSS
 *  expression() and url() with javascript: blocked.
 *
 *  We keep this as a from-scratch implementation rather than pulling in
 *  DOMPurify because we run server-side in Bun without a DOM. The output
 *  is safe to render in a sandboxed iframe with a strict CSP. */

/* eslint-disable no-control-regex */

const ALLOWED_TAGS = new Set([
  "a", "abbr", "address", "article", "aside", "b", "bdi", "bdo", "blockquote",
  "br", "caption", "cite", "code", "col", "colgroup", "dd", "details", "dfn",
  "div", "dl", "dt", "em", "figcaption", "figure", "footer", "h1", "h2", "h3",
  "h4", "h5", "h6", "header", "hr", "i", "img", "ins", "kbd", "li", "main",
  "mark", "nav", "ol", "p", "picture", "pre", "q", "s", "samp", "section",
  "small", "source", "span", "strong", "sub", "summary", "sup", "table",
  "tbody", "td", "tfoot", "th", "thead", "time", "tr", "u", "ul", "var", "wbr",
  "del", "center", "font", // legacy mail markup
  // Keep <style> contents — but we transform/scope CSS rather than removing
  // them entirely so the body still looks right.
  "style",
]);

const ALLOWED_ATTRS_GLOBAL = new Set([
  "title", "alt", "class", "dir", "lang", "id",
  "data-mail-cid", "data-mail-attachment", "data-mail-original-href",
]);

const ALLOWED_ATTRS_PER_TAG: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "name", "download"]),
  img: new Set(["src", "srcset", "sizes", "width", "height", "loading", "decoding"]),
  source: new Set(["src", "srcset", "sizes", "type", "media"]),
  table: new Set(["width", "border", "cellpadding", "cellspacing", "align", "bgcolor"]),
  td: new Set(["width", "height", "colspan", "rowspan", "align", "valign", "bgcolor"]),
  th: new Set(["width", "height", "colspan", "rowspan", "align", "valign", "bgcolor"]),
  tr: new Set(["align", "valign", "bgcolor"]),
  col: new Set(["span", "width"]),
  colgroup: new Set(["span"]),
  font: new Set(["color", "face", "size"]),
  div: new Set(["align"]),
  p: new Set(["align"]),
  blockquote: new Set(["cite"]),
  q: new Set(["cite"]),
  ol: new Set(["start", "type"]),
  li: new Set(["value"]),
  hr: new Set(["align", "noshade"]),
  pre: new Set([]),
  span: new Set([]),
};

const ATTR_VALUE_FILTERS: Record<string, (v: string) => string | null> = {
  href: filterUrl,
  src: filterUrl,
  cite: filterUrl,
  srcset: filterSrcset,
  target: (v) => (/^_(blank|self|parent|top)$/i.test(v) ? v : "_blank"),
};

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "cid:"]);

export interface SanitizeOptions {
  /** Replace external image URLs with the proxy URL builder. */
  imageProxy?: (remoteUrl: string) => string;
  /** Replace cid:foo refs with attachment URLs from this map. */
  cidMap?: Record<string, string>;
  /** Optional <base> for resolving relative URLs (defaults to "/"). */
  baseHref?: string;
  /** When true, drop all <img> entirely (strict mode). */
  stripImages?: boolean;
  /** Track tracking pixel URLs in this list (caller may inspect). */
  trackerLog?: string[];
}

export interface SanitizeResult {
  html: string;
  text: string;
  imageCount: number;
  linkCount: number;
  externalImages: string[];
  trackers: string[];
  inlineImages: string[];
}

const SELF_CLOSING = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "source", "track", "wbr",
]);

const TRACKER_HOSTS = new Set([
  "click.mail.com", "links.alphagra.de", "url.emailprotection.link",
  "track.mailchimp.com", "trk.bcfm.com", "open.convertkit-mail.com",
  "sendgrid.net", "mandrillapp.com", "mailgun.org",
  // Curated-list extension; production should replace with a vendored
  // ad-block-style list ingested at deploy time.
]);

function filterUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Block javascript: / vbscript: / data: (data: is allowed only for
  // image/* — handled by srcset filter below; anchors get null).
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("data:")) {
    return null;
  }
  // Validate protocol-prefixed urls.
  const m = trimmed.match(/^([a-z][a-z0-9+\-.]*):/i);
  if (m) {
    const proto = `${m[1].toLowerCase()}:`;
    if (!SAFE_PROTOCOLS.has(proto)) return null;
  }
  // Reject control chars.
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  return trimmed;
}

function filterSrcset(value: string): string | null {
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const [url, descriptor] = p.split(/\s+/, 2);
    const safe = filterUrl(url);
    if (!safe) continue;
    out.push(descriptor ? `${safe} ${descriptor}` : safe);
  }
  return out.length > 0 ? out.join(", ") : null;
}

interface Token {
  type: "text" | "open" | "close" | "selfclose" | "comment" | "doctype" | "cdata";
  raw: string;
  tag?: string;
  attrs?: Record<string, string>;
}

/** Tokenize HTML with a single forward pass. Doesn't aim to be a full
 *  HTML5 parser — emails rarely use html5 features. Handles malformed
 *  tags by treating them as text. */
function tokenize(html: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] !== "<") {
      let end = html.indexOf("<", i);
      if (end === -1) end = html.length;
      out.push({ type: "text", raw: html.slice(i, end) });
      i = end;
      continue;
    }
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      if (end === -1) {
        out.push({ type: "comment", raw: html.slice(i) });
        i = html.length;
        break;
      }
      out.push({ type: "comment", raw: html.slice(i, end + 3) });
      i = end + 3;
      continue;
    }
    if (html.startsWith("<!", i) || html.startsWith("<?", i)) {
      const end = html.indexOf(">", i);
      if (end === -1) {
        out.push({ type: "doctype", raw: html.slice(i) });
        i = html.length;
        break;
      }
      out.push({ type: "doctype", raw: html.slice(i, end + 1) });
      i = end + 1;
      continue;
    }
    if (html.startsWith("<![CDATA[", i)) {
      const end = html.indexOf("]]>", i + 9);
      if (end === -1) { i = html.length; break; }
      out.push({ type: "cdata", raw: html.slice(i + 9, end) });
      i = end + 3;
      continue;
    }
    // Real tag.
    const end = findTagEnd(html, i);
    if (end === -1) {
      // Malformed — emit as text.
      out.push({ type: "text", raw: html.slice(i, i + 1) });
      i++;
      continue;
    }
    const raw = html.slice(i, end + 1);
    const parsed = parseTag(raw);
    if (!parsed) {
      out.push({ type: "text", raw });
      i = end + 1;
      continue;
    }
    out.push(parsed);
    i = end + 1;
    // For raw-text elements (style/script/textarea/title) consume
    // contents verbatim until the matching close tag.
    if (
      parsed.type === "open" &&
      (parsed.tag === "script" || parsed.tag === "style" || parsed.tag === "textarea" || parsed.tag === "title" || parsed.tag === "noscript" || parsed.tag === "iframe")
    ) {
      const closeIdx = html.toLowerCase().indexOf(`</${parsed.tag}`, i);
      if (closeIdx === -1) { i = html.length; break; }
      const innerText = html.slice(i, closeIdx);
      if (parsed.tag === "style") {
        out.push({ type: "text", raw: sanitizeCssBlock(innerText) });
      }
      // script/textarea/title/iframe contents dropped entirely.
      const closeEnd = html.indexOf(">", closeIdx);
      i = closeEnd === -1 ? html.length : closeEnd + 1;
      out.push({ type: "close", raw: "", tag: parsed.tag });
    }
  }
  return out;
}

function findTagEnd(html: string, start: number): number {
  let i = start + 1;
  let inQuote: '"' | "'" | null = null;
  while (i < html.length) {
    const c = html[i];
    if (inQuote) {
      if (c === inQuote) inQuote = null;
    } else if (c === '"' || c === "'") {
      inQuote = c as '"' | "'";
    } else if (c === ">") {
      return i;
    }
    i++;
  }
  return -1;
}

function parseTag(raw: string): Token | null {
  // raw includes < and >.
  const inner = raw.slice(1, -1).trim();
  if (!inner) return null;
  const isClose = inner.startsWith("/");
  const body = isClose ? inner.slice(1).trimStart() : inner;
  const m = body.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  if (isClose) return { type: "close", raw, tag };
  const rest = body.slice(m[0].length);
  const attrs: Record<string, string> = {};
  const attrRe = /\s+([a-zA-Z_:][\w:.\-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>=`]+)))?/g;
  let am: RegExpExecArray | null;
  while ((am = attrRe.exec(rest)) !== null) {
    const name = am[1].toLowerCase();
    const value = am[3] ?? am[4] ?? am[5] ?? "";
    attrs[name] = decodeHtmlEntities(value);
  }
  const isSelfClose = /\/\s*$/.test(rest) || SELF_CLOSING.has(tag);
  return {
    type: isSelfClose ? "selfclose" : "open",
    raw,
    tag,
    attrs,
  };
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_m, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&amp;/g, "&");
}

function escapeAttrValue(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeText(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeCssBlock(css: string): string {
  // Remove `expression(...)`, `behavior:`, `-moz-binding`, javascript: urls.
  let out = css;
  out = out.replace(/expression\s*\([^)]*\)/gi, "/*blocked*/");
  out = out.replace(/behavior\s*:[^;}]*/gi, "/*blocked*/");
  out = out.replace(/-moz-binding\s*:[^;}]*/gi, "/*blocked*/");
  out = out.replace(/url\s*\(\s*["']?\s*javascript:[^)]*\)/gi, "url(/*blocked*/)");
  out = out.replace(/@import\s+(?:url\s*\()?["']?javascript:[^)"';]*/gi, "/*blocked*/");
  return out;
}

export function sanitizeHtml(html: string, options: SanitizeOptions = {}): SanitizeResult {
  const tokens = tokenize(html ?? "");
  const out: string[] = [];
  const externalImages: string[] = [];
  const trackers: string[] = [];
  const inlineImages: string[] = [];
  let imageCount = 0;
  let linkCount = 0;
  // We always wrap output in a fresh <div> — no <html>/<head>/<body>.
  // <style> is preserved but only with sanitized content.
  for (const t of tokens) {
    if (t.type === "text") { out.push(escapeText(t.raw)); continue; }
    if (t.type === "comment" || t.type === "doctype") continue;
    if (t.type === "cdata") { out.push(escapeText(t.raw)); continue; }
    if (!t.tag || !ALLOWED_TAGS.has(t.tag)) continue;

    const attrs = t.attrs ?? {};
    // <img> handling.
    if (t.tag === "img") {
      if (options.stripImages) continue;
      const cid = (attrs.src ?? "").toLowerCase().startsWith("cid:")
        ? (attrs.src ?? "").slice(4)
        : null;
      let src = attrs.src ?? "";
      if (cid) {
        if (options.cidMap && options.cidMap[cid]) {
          src = options.cidMap[cid];
          inlineImages.push(cid);
        } else {
          // Unresolved cid → drop.
          continue;
        }
      } else if (/^https?:\/\//i.test(src) && options.imageProxy) {
        externalImages.push(src);
        // 1x1 trackers → log + skip.
        const isLikelyTracker =
          isTrackerHost(src) ||
          /[?&](utm|click|track|email|recipient)/i.test(src) ||
          /(open|pixel|beacon|track)\.gif/i.test(src);
        if (isLikelyTracker) {
          trackers.push(src);
          if (options.trackerLog) options.trackerLog.push(src);
          continue;
        }
        src = options.imageProxy(src);
      } else if (!/^https?:\/\//i.test(src)) {
        continue;
      }
      attrs.src = src;
      attrs.loading = attrs.loading ?? "lazy";
      attrs.decoding = "async";
      imageCount++;
    }
    if (t.tag === "a") {
      const href = attrs.href ? filterUrl(attrs.href) : null;
      if (!href) continue;
      attrs["data-mail-original-href"] = attrs.href;
      attrs.href = href;
      attrs.target = "_blank";
      attrs.rel = "noopener noreferrer nofollow ugc";
      linkCount++;
    }

    // Strip disallowed attributes.
    const safe: Record<string, string> = {};
    const allowedForTag = ALLOWED_ATTRS_PER_TAG[t.tag] ?? new Set();
    for (const [name, value] of Object.entries(attrs)) {
      if (name.startsWith("on")) continue;
      // Drop known dangerous global attrs.
      if (name === "style") {
        const cleaned = sanitizeCssBlock(value).replace(/javascript:/gi, "/*blocked*/");
        safe.style = cleaned;
        continue;
      }
      if (!ALLOWED_ATTRS_GLOBAL.has(name) && !allowedForTag.has(name)) continue;
      const filter = ATTR_VALUE_FILTERS[name];
      const v = filter ? filter(value) : value;
      if (v === null) continue;
      safe[name] = v;
    }
    if (t.type === "open") out.push(renderOpenTag(t.tag, safe, false));
    else if (t.type === "selfclose") out.push(renderOpenTag(t.tag, safe, true));
    else if (t.type === "close") out.push(`</${t.tag}>`);
  }

  const html2 = out.join("");
  return {
    html: html2,
    text: htmlToPlainText(html2),
    imageCount,
    linkCount,
    externalImages,
    trackers,
    inlineImages,
  };
}

function renderOpenTag(tag: string, attrs: Record<string, string>, selfClose: boolean): string {
  const rendered = Object.entries(attrs)
    .map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${escapeAttrValue(v)}"`))
    .join("");
  return selfClose ? `<${tag}${rendered} />` : `<${tag}${rendered}>`;
}

function isTrackerHost(url: string): boolean {
  try {
    const u = new URL(url);
    if (TRACKER_HOSTS.has(u.host)) return true;
    for (const seg of u.host.split(".")) {
      if (seg === "track" || seg === "click" || seg === "open" || seg === "pixel") return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Cheap HTML → plain-text. Strips all tags, normalizes whitespace. */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  let s = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|li|tr|h\d)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeHtmlEntities(s);
  s = s.replace(/\u00A0/g, " ").replace(/[\t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/** Convert plain text to safe HTML (preserves newlines + URLs). */
export function plainTextToHtml(text: string): string {
  const escaped = escapeText(text ?? "");
  const linked = escaped.replace(
    /\b(https?:\/\/[^\s<>"]+)/g,
    (m) => `<a href="${escapeAttrValue(m)}" target="_blank" rel="noopener noreferrer nofollow">${m}</a>`,
  );
  return linked.replace(/\n/g, "<br />");
}

/** First N characters of plain-text content as a list-row preview. */
export function previewFromHtml(html: string, max = 240): string {
  const text = htmlToPlainText(html).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
