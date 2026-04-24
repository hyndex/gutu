import * as React from "react";
import { Send, Sparkles } from "lucide-react";
import { defineCustomView } from "@/builders";
import { PageHeader } from "@/admin-primitives/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/admin-primitives/Card";
import { Button } from "@/primitives/Button";
import { Textarea } from "@/primitives/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/primitives/Select";
import { LineChart } from "@/admin-primitives/charts/LineChart";
import { cn } from "@/lib/cn";

export const aiPlaygroundView = defineCustomView({
  id: "ai-core.playground.view",
  title: "Playground",
  description: "Chat with any configured model.",
  resource: "ai-core.model",
  render: () => <PlaygroundUI />,
});

function PlaygroundUI() {
  const [messages, setMessages] = React.useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Hi — I'm a mock Claude endpoint. Ask me anything. Responses are canned for the preview." },
  ]);
  const [input, setInput] = React.useState("");
  const [model, setModel] = React.useState("claude-opus-4-7");
  const [busy, setBusy] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text:
          q.toLowerCase().includes("summar")
            ? "Sure — here's a 3-line summary: (1) the admin panel is universal; (2) plugins declare schemas, not UI; (3) every page composes reusable primitives."
            : `I received "${q}". In production this would route to ${model} via \`ai-core.chat\`.`,
      },
    ]);
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="AI Playground"
        description="Prompt the selected model with full token accounting."
        actions={
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-opus-4-7">claude-opus-4-7</SelectItem>
              <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6</SelectItem>
              <SelectItem value="claude-haiku-4-5">claude-haiku-4-5</SelectItem>
              <SelectItem value="gpt-4o">gpt-4o</SelectItem>
              <SelectItem value="gemini-2.5-pro">gemini-2.5-pro</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <Card>
        <CardContent className="p-0">
          <div
            ref={ref}
            className="h-[420px] overflow-y-auto p-4 flex flex-col gap-3 bg-surface-1"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "self-end bg-accent text-accent-fg"
                    : "self-start bg-surface-0 border border-border text-text-primary",
                )}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <div className="self-start text-xs text-text-muted inline-flex items-center gap-2">
                <Sparkles className="h-3 w-3 animate-pulse" />
                {model} is thinking…
              </div>
            )}
          </div>
          <div className="flex items-end gap-2 p-3 border-t border-border">
            <Textarea
              rows={2}
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void send();
                }
              }}
              className="flex-1"
            />
            <Button
              variant="primary"
              size="md"
              loading={busy}
              iconLeft={<Send className="h-3.5 w-3.5" />}
              onClick={send}
            >
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Tokens this session</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-text-primary">{messages.length * 180}</div>
            <div className="text-xs text-text-muted">
              prompt · {messages.filter((m) => m.role === "user").length * 90} completion
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Latency (last 20 calls)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart
              xLabels={Array.from({ length: 20 }, (_, i) => `${i + 1}`)}
              series={[
                {
                  label: "ms",
                  data: Array.from({ length: 20 }, (_, i) => 600 + Math.sin(i) * 200 + (i * 23) % 180),
                },
              ]}
              height={160}
              valueFormatter={(v) => `${Math.round(v)}ms`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
