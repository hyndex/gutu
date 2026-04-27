/** Prompts — server-supplied prompt templates the agent can fetch.
 *
 *  An MCP prompt is a named template that returns a list of `messages`
 *  the client can prepend to its conversation. They're how the
 *  framework ships "Industry packs" — a curated set of system prompts
 *  + few-shot examples for CRM agents, Accounting agents, etc.
 *
 *  Argument substitution: prompt definitions declare an argument
 *  schema; the call passes values that get interpolated into the
 *  message text via `{{name}}` placeholders. */

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: PromptArgument[];
}

export interface PromptMessage {
  role: "user" | "assistant" | "system";
  content: { type: "text"; text: string };
}

export interface PromptHandler {
  definition: PromptDefinition;
  /** Render the messages for the given arguments. Throw on missing
   *  required args. */
  render(args: Record<string, string>): { description?: string; messages: PromptMessage[] };
}

const REGISTRY = new Map<string, PromptHandler>();

export function registerPrompt(handler: PromptHandler): void {
  REGISTRY.set(handler.definition.name, handler);
}

export function getPrompt(name: string): PromptHandler | undefined {
  return REGISTRY.get(name);
}

export function listPrompts(): PromptHandler[] {
  return Array.from(REGISTRY.values()).sort((a, b) => a.definition.name.localeCompare(b.definition.name));
}

export function _resetPrompts_forTest(): void {
  REGISTRY.clear();
}

/** Substitute `{{name}}` placeholders in a template string. Missing
 *  args render as the empty string — callers can declare required
 *  args via the definition to fail-fast instead. */
export function interpolate(template: string, args: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, name) => args[name] ?? "");
}

/* -- Built-in prompt packs --------------------------------------- */

/** Helper used by the built-in packs. Validates required args + returns
 *  a single-message system prompt template. */
function systemPromptHandler(args: {
  name: string;
  description: string;
  arguments?: PromptArgument[];
  template: string;
}): PromptHandler {
  return {
    definition: { name: args.name, description: args.description, arguments: args.arguments },
    render(values) {
      for (const a of args.arguments ?? []) {
        if (a.required && !values[a.name]) {
          throw new Error(`missing required argument: ${a.name}`);
        }
      }
      return {
        description: args.description,
        messages: [
          { role: "system", content: { type: "text", text: interpolate(args.template, values) } },
        ],
      };
    },
  };
}

/** Register the framework's built-in prompts. Idempotent — replaces
 *  previous registrations. Call once at boot. */
export function registerBuiltInPrompts(): void {
  registerPrompt(systemPromptHandler({
    name: "crm.weekly-summary",
    description: "System prompt for an agent that produces a weekly CRM activity summary.",
    arguments: [
      { name: "owner", description: "Sales owner whose pipeline to summarise.", required: false },
      { name: "period", description: "Time range — `7d`, `30d`. Defaults to `7d`.", required: false },
    ],
    template: `You are a CRM analytics agent. Produce a concise summary of pipeline activity for {{owner}} over the last {{period}}.

Use ONLY data fetched via tools (crm.contact.list, sales.deal.list, sales.deal.search). Never invent numbers.

Format: 4 sections — New leads, Pipeline movement, Wins / losses, Risks. Each section: 2-4 bullet points, numbers in parentheses. Total length: 200-300 words.

If a tool call fails, say so explicitly and report what you DO know rather than guessing.`,
  }));

  registerPrompt(systemPromptHandler({
    name: "accounting.month-end-checklist",
    description: "Walks the agent through the month-end accounting close checklist.",
    arguments: [
      { name: "month", description: "ISO month, e.g. 2026-04.", required: true },
    ],
    template: `You are an accounting close agent. Walk through the month-end checklist for {{month}}.

Steps (in order):
  1. List all open invoices that should be closed (accounting.invoice.list filter status=draft).
  2. List all unposted journal entries (accounting.journal-entry.list filter status=draft).
  3. Reconcile bank statements (accounting.bank-statement.list).
  4. Confirm AR + AP totals match the period's GL trial balance.
  5. Produce a short status report with anything blocking close.

You CANNOT post journals or pay bills — those are irreversible and require human dual-key. Only summarise + flag.`,
  }));

  registerPrompt(systemPromptHandler({
    name: "support.triage-ticket",
    description: "Triages a single support ticket: severity, owner, suggested next step.",
    arguments: [
      { name: "ticketId", description: "support.ticket id", required: true },
    ],
    template: `You are a support triage agent. Analyse ticket {{ticketId}}.

Steps:
  1. Fetch the ticket (support.ticket.get id={{ticketId}}).
  2. Fetch the customer (crm.contact.get id={ticket.contactId}) and any prior tickets (support.ticket.search query=<customer name>).
  3. Classify severity (P0/P1/P2/P3) using the rules: P0 = production down, P1 = severe degradation, P2 = workaround exists, P3 = nice to have.
  4. Suggest an owner queue (eng / cs / billing).
  5. Suggest a next step (specific question to ask the customer / escalation path).

Output: 5-line summary in this exact shape:
  Severity: <P0|P1|P2|P3>
  Owner: <queue>
  Why: <one sentence>
  Next step: <one sentence>
  Risk: <one sentence>`,
  }));

  registerPrompt(systemPromptHandler({
    name: "ops.incident-response",
    description: "Drives an incident-response loop reading from audit + telemetry.",
    arguments: [
      { name: "incident", description: "Short description of the incident.", required: true },
      { name: "since", description: "ISO timestamp to start the audit search.", required: false },
    ],
    template: `You are an SRE incident-response agent helping with: {{incident}}.

Investigation loop:
  1. Search audit log (audit.event.search) for unusual activity since {{since}}.
  2. Search recent MCP calls (mcp.call.search) for failed mutations.
  3. List latest deployments (platform.deployment.list).
  4. Suggest a root-cause hypothesis with evidence.

You read but do NOT act. All remediation steps go to a human runbook.`,
  }));
}
