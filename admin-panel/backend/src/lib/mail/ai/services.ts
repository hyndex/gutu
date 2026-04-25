/** High-level AI services that the route layer calls.
 *
 *  Each function loads the relevant context (thread/message), assembles the
 *  prompt, dispatches via runChat, parses, and persists results. */

import { db, nowIso } from "../../../db";
import { uuid } from "../../id";
import { runChat } from ".";
import {
  classifyPrompt,
  draftPrompt,
  improvePrompt,
  smartReplyPrompt,
  subjectPrompt,
  summaryPrompt,
  translatePrompt,
} from "./prompts";
import { htmlToPlainText } from "../mime/sanitize";

export interface SummaryOutput {
  tldr: string;
  bullets: string[];
  cached: boolean;
  raw: string;
}

export async function summarizeThread(args: {
  userId: string;
  tenantId: string;
  threadId: string;
}): Promise<SummaryOutput> {
  const messages = loadThreadMessages(args.threadId);
  if (messages.length === 0) return { tldr: "", bullets: [], cached: false, raw: "" };
  const cached = readSummary(args.threadId);
  const lastUpdated = messages[messages.length - 1].receivedAt;
  if (cached && cached.cachedFor === lastUpdated) {
    return { ...parseSummary(cached.content), cached: true, raw: cached.content };
  }
  const text = messages
    .map((m) => `From: ${m.fromEmail}\nDate: ${m.receivedAt}\nSubject: ${m.subject}\n\n${htmlToPlainText(m.bodyHtml ?? "") || (m.bodyText ?? "")}`)
    .join("\n\n---\n\n");
  const result = await runChat({
    action: "summary",
    userId: args.userId,
    tenantId: args.tenantId,
    threadId: args.threadId,
    messages: summaryPrompt(text),
    temperature: 0.2,
    maxTokens: 700,
  });
  saveSummary(args.threadId, lastUpdated, result.text, args.tenantId);
  return { ...parseSummary(result.text), cached: false, raw: result.text };
}

export async function smartReply(args: {
  userId: string;
  tenantId: string;
  threadId: string;
  styleHint?: string | null;
}): Promise<{ suggestions: string[] }> {
  const msgs = loadThreadMessages(args.threadId).slice(-5);
  const text = msgs
    .map((m) => `${m.fromEmail}: ${htmlToPlainText(m.bodyHtml ?? "") || (m.bodyText ?? "")}`)
    .join("\n\n");
  const result = await runChat({
    action: "smart-reply",
    userId: args.userId,
    tenantId: args.tenantId,
    threadId: args.threadId,
    messages: smartReplyPrompt(text, args.styleHint ?? null),
    temperature: 0.6,
    maxTokens: 250,
  });
  return { suggestions: splitOnSep(result.text, "---").slice(0, 3) };
}

export async function suggestSubject(args: {
  userId: string;
  tenantId: string;
  bodyText: string;
}): Promise<{ suggestions: string[] }> {
  const result = await runChat({
    action: "subject",
    userId: args.userId,
    tenantId: args.tenantId,
    messages: subjectPrompt(args.bodyText),
    temperature: 0.5,
    maxTokens: 80,
  });
  return { suggestions: result.text.split(/\n+/).map((s) => s.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 3) };
}

export interface Classification {
  category: "primary" | "promotions" | "social" | "updates" | "forums";
  spam: boolean;
  spamScore: number;
  confidence: number;
  reasons: string[];
}

export async function classifyMessage(args: {
  userId: string;
  tenantId: string;
  text: string;
}): Promise<Classification> {
  const result = await runChat({
    action: "classify",
    userId: args.userId,
    tenantId: args.tenantId,
    messages: classifyPrompt(args.text),
    temperature: 0,
    maxTokens: 200,
  });
  return parseClassification(result.text);
}

export async function generateDraft(args: {
  userId: string;
  tenantId: string;
  brief: string;
  recipientName?: string;
  styleHint?: string | null;
}): Promise<{ body: string }> {
  const result = await runChat({
    action: "draft",
    userId: args.userId,
    tenantId: args.tenantId,
    messages: draftPrompt(args.brief, args.recipientName, args.styleHint ?? null),
    temperature: 0.4,
    maxTokens: 1200,
  });
  return { body: result.text.trim() };
}

export async function improveText(args: {
  userId: string;
  tenantId: string;
  text: string;
  mode: "shorter" | "friendlier" | "more-formal" | "fix-grammar";
}): Promise<{ text: string }> {
  const result = await runChat({
    action: "improve",
    userId: args.userId,
    tenantId: args.tenantId,
    messages: improvePrompt(args.text, args.mode),
    temperature: 0.3,
    maxTokens: 1200,
  });
  return { text: result.text.trim() };
}

export async function translateText(args: {
  userId: string;
  tenantId: string;
  text: string;
  targetLocale: string;
}): Promise<{ text: string }> {
  const result = await runChat({
    action: "translate",
    userId: args.userId,
    tenantId: args.tenantId,
    messages: translatePrompt(args.text, args.targetLocale),
    temperature: 0,
    maxTokens: 1200,
  });
  return { text: result.text.trim() };
}

/* ---------------- helpers ---------------- */

interface MsgRow {
  id: string;
  threadId: string;
  fromEmail: string;
  subject: string;
  receivedAt: string;
  bodyText?: string;
  bodyHtml?: string;
}

function loadThreadMessages(threadId: string): MsgRow[] {
  const rows = db
    .prepare(
      `SELECT data FROM records WHERE resource = 'mail.message' AND json_extract(data, '$.threadId') = ?
       ORDER BY json_extract(data, '$.receivedAt') ASC LIMIT 50`,
    )
    .all(threadId) as { data: string }[];
  return rows.map((r) => {
    const m = JSON.parse(r.data) as Record<string, unknown>;
    return {
      id: String(m.id ?? ""),
      threadId: String(m.threadId ?? ""),
      fromEmail: ((m.from as { email?: string } | undefined)?.email) ?? "",
      subject: String(m.subject ?? ""),
      receivedAt: String(m.receivedAt ?? ""),
      bodyText: m.bodyText as string | undefined,
      bodyHtml: m.bodyHtml as string | undefined,
    };
  });
}

function readSummary(threadId: string): { content: string; cachedFor: string } | null {
  const row = db
    .prepare(`SELECT data FROM records WHERE resource = 'mail.summary' AND json_extract(data, '$.threadId') = ?`)
    .get(threadId) as { data: string } | undefined;
  if (!row) return null;
  const r = JSON.parse(row.data) as Record<string, unknown>;
  return { content: String(r.content ?? ""), cachedFor: String(r.cachedFor ?? "") };
}

function saveSummary(threadId: string, cachedFor: string, content: string, tenantId: string): void {
  const id = `sum_${threadId}`;
  const now = nowIso();
  const data = JSON.stringify({ id, threadId, content, cachedFor, tenantId, createdAt: now, updatedAt: now });
  db.prepare(
    `INSERT INTO records (resource, id, data, created_at, updated_at)
     VALUES ('mail.summary', ?, ?, ?, ?)
     ON CONFLICT(resource, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(id, data, now, now);
  void uuid;
}

function parseSummary(text: string): { tldr: string; bullets: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { tldr: "", bullets: [] };
  const tldr = lines[0].replace(/^TL;DR[: ]*/i, "").replace(/^summary[: ]*/i, "");
  const bullets = lines.slice(1).filter((l) => /^[-*•]/.test(l)).map((l) => l.replace(/^[-*•]\s*/, ""));
  return { tldr, bullets };
}

function parseClassification(text: string): Classification {
  try {
    const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    const parsed = JSON.parse(trimmed);
    return {
      category: (parsed.category ?? "primary"),
      spam: !!parsed.spam,
      spamScore: Number(parsed.spamScore ?? 0),
      confidence: Number(parsed.confidence ?? 0.5),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
    };
  } catch {
    return { category: "primary", spam: false, spamScore: 0, confidence: 0.3, reasons: [] };
  }
}

function splitOnSep(text: string, sep: string): string[] {
  return text.split(new RegExp(`^${sep}\\s*$`, "m")).map((s) => s.trim()).filter(Boolean);
}
