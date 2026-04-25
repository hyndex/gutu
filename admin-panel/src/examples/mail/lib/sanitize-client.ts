/** Conservative client-side sanitizer — used for the reader iframe srcdoc.
 *  Mirrors the server-side allow-list so what the user composes round-trips. */

const ALLOWED_TAGS = new Set([
  "a", "b", "br", "blockquote", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "i", "img", "li", "ol", "p", "pre", "s", "small", "span", "strong", "sub", "sup",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul", "del", "ins", "mark",
  "figure", "figcaption", "section", "article", "header", "footer", "main", "aside", "nav",
]);

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "cid:"]);

function isSafeUrl(value: string): boolean {
  const lower = value.trim().toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("data:")) return false;
  const m = value.match(/^([a-z][a-z0-9+\-.]*):/i);
  if (m) return SAFE_PROTOCOLS.has(`${m[1].toLowerCase()}:`);
  return true;
}

export function clientSanitize(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;
  let doc: Document;
  try { doc = new DOMParser().parseFromString(html, "text/html"); }
  catch { return ""; }
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const drop: Element[] = [];
  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    if (!ALLOWED_TAGS.has(el.tagName.toLowerCase())) {
      drop.push(el);
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on")) { el.removeAttribute(attr.name); continue; }
      if (attr.name === "style") {
        const cleaned = (attr.value ?? "").replace(/expression\s*\([^)]*\)/gi, "").replace(/javascript:/gi, "");
        el.setAttribute("style", cleaned);
        continue;
      }
      if (attr.name === "href" || attr.name === "src" || attr.name === "cite") {
        if (!isSafeUrl(attr.value)) el.removeAttribute(attr.name);
      }
    }
  }
  for (const el of drop) el.replaceWith(...el.childNodes);
  return doc.body.innerHTML;
}
