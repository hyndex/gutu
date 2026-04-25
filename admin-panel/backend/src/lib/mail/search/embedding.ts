/** Pluggable embedding provider with a deterministic fallback.
 *
 *  Order of preference:
 *    1. `MAIL_EMBED_PROVIDER=openai` + `OPENAI_API_KEY` → OpenAI text-embedding-3-small (1536d).
 *    2. `MAIL_EMBED_PROVIDER=ollama` + `MAIL_EMBED_OLLAMA_URL` → local Ollama nomic-embed (768d).
 *    3. `MAIL_EMBED_PROVIDER=local` (default) → deterministic 256-dim hashing.
 *
 *  The deterministic fallback is _not_ semantically meaningful — it simply
 *  guarantees a valid vector so the rest of the system runs end-to-end in
 *  air-gapped environments. Operators who want real semantic search must
 *  set up an external provider. */

const PROVIDER = (process.env.MAIL_EMBED_PROVIDER ?? "local").toLowerCase();
const LOCAL_DIM = 256;

export interface EmbedDocument {
  text: string;
  /** Optional content scoping for caching. */
  id?: string;
}

export async function embedQuery(text: string): Promise<Float32Array | null> {
  if (!text.trim()) return null;
  return embed(text);
}

export async function embed(text: string): Promise<Float32Array> {
  if (PROVIDER === "openai") {
    try { return await embedOpenAI(text); } catch (err) {
      console.warn("[mail.embed] OpenAI failed, falling back to local:", err);
      return embedLocal(text);
    }
  }
  if (PROVIDER === "ollama") {
    try { return await embedOllama(text); } catch (err) {
      console.warn("[mail.embed] Ollama failed, falling back to local:", err);
      return embedLocal(text);
    }
  }
  return embedLocal(text);
}

async function embedOpenAI(text: string): Promise<Float32Array> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const model = process.env.MAIL_EMBED_OPENAI_MODEL ?? "text-embedding-3-small";
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text.slice(0, 8000), model }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { data?: { embedding: number[] }[] };
  const vec = data.data?.[0]?.embedding;
  if (!vec) throw new Error("no embedding in OpenAI response");
  return new Float32Array(vec);
}

async function embedOllama(text: string): Promise<Float32Array> {
  const url = process.env.MAIL_EMBED_OLLAMA_URL ?? "http://127.0.0.1:11434";
  const model = process.env.MAIL_EMBED_OLLAMA_MODEL ?? "nomic-embed-text";
  const res = await fetch(`${url}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = (await res.json()) as { embedding?: number[] };
  if (!data.embedding) throw new Error("no embedding in Ollama response");
  return new Float32Array(data.embedding);
}

function embedLocal(text: string): Float32Array {
  // Deterministic feature-hashing of word grams. This produces a stable
  // pseudo-vector that's only useful for collision tests, not semantic
  // similarity. Documented limitation.
  const out = new Float32Array(LOCAL_DIM);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const tok of tokens) {
    const h = djb2(tok);
    out[h % LOCAL_DIM] += 1;
  }
  // L2 normalize.
  let mag = 0;
  for (let i = 0; i < out.length; i++) mag += out[i] * out[i];
  mag = Math.sqrt(mag);
  if (mag > 0) {
    for (let i = 0; i < out.length; i++) out[i] /= mag;
  }
  return out;
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
}

/** Pack a Float32Array into a Buffer for SQLite BLOB storage. */
export function packVector(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}

export function vectorMagnitude(v: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}
