/** Prompt library — all rebranded as Gutu Mail.
 *
 *  Prompts are kept short and assertive. Each function returns the
 *  message array ready to feed into `runChat`. The returned prompts are
 *  deterministic given inputs so we can fingerprint and cache results. */

import type { AiMessage } from ".";

const ASSISTANT_PERSONA =
  "You are Gutu Mail's assistant. You write concise, professional emails in the user's voice. Keep responses short, friendly, and skimmable. Never invent facts not present in the source material.";

export function summaryPrompt(threadText: string, locale = "en"): AiMessage[] {
  return [
    {
      role: "system",
      content:
        "You summarize email threads. Output: one-sentence TL;DR followed by 3-5 bullet points covering decisions, asks, and unresolved items. Use the recipient's locale.",
    },
    {
      role: "user",
      content: `Locale: ${locale}\n\nThread:\n\n${truncate(threadText, 8000)}`,
    },
  ];
}

export function smartReplyPrompt(
  threadText: string,
  styleHint: string | null,
  locale = "en",
): AiMessage[] {
  return [
    {
      role: "system",
      content:
        `${ASSISTANT_PERSONA}\nGenerate exactly 3 reply suggestions, separated by '---' on its own line. Each reply <= 25 words. No greetings, no signatures.${styleHint ? `\nUser style hint: ${styleHint}` : ""}`,
    },
    { role: "user", content: `Locale: ${locale}\n\nThread:\n\n${truncate(threadText, 6000)}` },
  ];
}

export function subjectPrompt(bodyText: string): AiMessage[] {
  return [
    { role: "system", content: "Suggest exactly 3 subject lines for the draft below. One per line, no numbering, <= 8 words each." },
    { role: "user", content: truncate(bodyText, 3000) },
  ];
}

export function classifyPrompt(messageText: string): AiMessage[] {
  return [
    {
      role: "system",
      content:
        'Classify the email into JSON with keys: category in [primary, promotions, social, updates, forums], spam (boolean), spamScore (0-1), confidence (0-1), reasons (array of strings). Output only the JSON.',
    },
    { role: "user", content: truncate(messageText, 6000) },
  ];
}

export function draftPrompt(brief: string, recipientName?: string, styleHint?: string | null): AiMessage[] {
  return [
    {
      role: "system",
      content:
        `${ASSISTANT_PERSONA}\nWrite a complete email body in the user's voice. Plain prose, no signature, no subject line. ${styleHint ? `Style hint: ${styleHint}.` : ""}`.trim(),
    },
    {
      role: "user",
      content: `Recipient: ${recipientName ?? "the recipient"}\n\nBrief:\n${truncate(brief, 4000)}`,
    },
  ];
}

export function improvePrompt(text: string, mode: "shorter" | "friendlier" | "more-formal" | "fix-grammar"): AiMessage[] {
  return [
    {
      role: "system",
      content:
        `Rewrite the user's draft. Mode: ${mode}. Preserve meaning. Reply with only the rewritten text — no commentary.`,
    },
    { role: "user", content: truncate(text, 4000) },
  ];
}

export function agentSystemPrompt(toolDescriptions: string): AiMessage[] {
  return [
    {
      role: "system",
      content:
        `${ASSISTANT_PERSONA}\nYou can call tools to read mail, search the inbox, draft a reply, and (with explicit user confirmation) send messages. Reply in JSON when calling a tool: {"tool": <name>, "args": {...}}. Otherwise reply in natural prose.\n\nAvailable tools:\n${toolDescriptions}`,
    },
  ];
}

export function translatePrompt(text: string, targetLocale: string): AiMessage[] {
  return [
    { role: "system", content: `Translate the user's text to ${targetLocale}. Reply with only the translation.` },
    { role: "user", content: truncate(text, 4000) },
  ];
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 8)} […]`;
}
