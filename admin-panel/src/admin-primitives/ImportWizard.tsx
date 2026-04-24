import * as React from "react";
import { AlertTriangle, Check, FileUp, UploadCloud } from "lucide-react";
import { Dialog, DialogContent } from "@/primitives/Dialog";
import { Button } from "@/primitives/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/primitives/Select";
import { Badge } from "@/primitives/Badge";
import { cn } from "@/lib/cn";
import { WorkflowStepper } from "./WorkflowStepper";
import { useRuntime } from "@/runtime/context";

export interface ImportField {
  name: string;
  label: string;
  required?: boolean;
}

export interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: string;
  fields: readonly ImportField[];
  /** Commit N parsed rows. Return the per-row outcome. */
  onCommit: (rows: Record<string, unknown>[]) => Promise<{
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; message: string }[];
  }>;
}

type Step = "upload" | "map" | "preview" | "commit" | "done";

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const split = (line: string) => {
    // minimal CSV split handling quoted fields with commas
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = !quoted;
      } else if (c === "," && !quoted) {
        out.push(cur); cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map(split);
  return { headers, rows };
}

export function ImportWizard({
  open,
  onOpenChange,
  resource,
  fields,
  onCommit,
}: ImportWizardProps) {
  const { analytics } = useRuntime();
  const [step, setStep] = React.useState<Step>("upload");
  const [fileName, setFileName] = React.useState<string>("");
  const [parsed, setParsed] = React.useState<{ headers: string[]; rows: string[][] }>({ headers: [], rows: [] });
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<Awaited<ReturnType<typeof onCommit>> | null>(null);
  const [committing, setCommitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setStep("upload");
      setFileName("");
      setParsed({ headers: [], rows: [] });
      setMapping({});
      setResult(null);
      setError(null);
    }
  }, [open]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const p = parseCsv(text);
    setParsed(p);
    // naive auto-map: exact header → field match
    const auto: Record<string, string> = {};
    for (const f of fields) {
      const match = p.headers.find((h) => h.toLowerCase() === f.name.toLowerCase() || h.toLowerCase() === f.label.toLowerCase());
      if (match) auto[f.name] = match;
    }
    setMapping(auto);
    setStep("map");
    analytics.emit("page.import.started", { resource, source: "csv" });
  };

  const mappedRows = React.useMemo(() => {
    if (parsed.rows.length === 0) return [];
    return parsed.rows.map((row) => {
      const r: Record<string, unknown> = {};
      for (const f of fields) {
        const col = mapping[f.name];
        if (!col) continue;
        const idx = parsed.headers.indexOf(col);
        if (idx >= 0) r[f.name] = row[idx];
      }
      return r;
    });
  }, [parsed, mapping, fields]);

  const missingRequired = fields
    .filter((f) => f.required && !mapping[f.name])
    .map((f) => f.label);

  const commit = async () => {
    setCommitting(true);
    setError(null);
    try {
      const r = await onCommit(mappedRows);
      setResult(r);
      setStep("done");
      analytics.emit("page.import.committed", {
        resource,
        rows: r.created + r.updated,
        errors: r.errors.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <div className="px-5 py-3 border-b border-border">
          <div className="text-sm font-semibold text-text-primary">
            Import {resource}
          </div>
        </div>
        <div className="p-5 pb-3">
          <WorkflowStepper
            steps={[
              { id: "upload", label: "Upload" },
              { id: "map", label: "Map" },
              { id: "preview", label: "Preview" },
              { id: "commit", label: "Commit" },
            ]}
            activeId={step === "done" ? "commit" : step}
          />
        </div>
        <div className="p-5 pt-0 min-h-[240px]">
          {step === "upload" && <UploadStep onFile={handleFile} />}
          {step === "map" && (
            <MapStep
              fields={fields}
              headers={parsed.headers}
              mapping={mapping}
              onChange={setMapping}
              fileName={fileName}
              rowCount={parsed.rows.length}
              missingRequired={missingRequired}
            />
          )}
          {step === "preview" && (
            <PreviewStep fields={fields} rows={mappedRows.slice(0, 20)} total={mappedRows.length} />
          )}
          {step === "done" && result && <DoneStep result={result} />}
          {error && (
            <div className="mt-3 text-xs text-intent-danger">{error}</div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step === "map" && (
              <Button
                variant="primary"
                size="sm"
                disabled={missingRequired.length > 0}
                onClick={() => setStep("preview")}
              >
                Preview
              </Button>
            )}
            {step === "preview" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setStep("map")}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={commit}
                  loading={committing}
                >
                  Commit {mappedRows.length} rows
                </Button>
              </>
            )}
            {step === "done" && (
              <Button variant="primary" size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadStep({ onFile }: { onFile: (f: File) => void }) {
  const [drag, setDrag] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={cn(
        "border-2 border-dashed rounded-md px-6 py-10 text-center transition-colors",
        drag ? "border-accent bg-accent/5" : "border-border",
      )}
    >
      <UploadCloud className="h-8 w-8 mx-auto text-text-muted" />
      <div className="text-sm text-text-primary mt-2 font-medium">
        Drop a CSV file
      </div>
      <div className="text-xs text-text-muted mt-1">
        or click to choose a file
      </div>
      <input
        ref={ref}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        className="mt-3"
        onClick={() => ref.current?.click()}
        iconLeft={<FileUp className="h-3.5 w-3.5" />}
      >
        Choose file
      </Button>
    </div>
  );
}

function MapStep({
  fields,
  headers,
  mapping,
  onChange,
  fileName,
  rowCount,
  missingRequired,
}: {
  fields: readonly ImportField[];
  headers: readonly string[];
  mapping: Record<string, string>;
  onChange: (m: Record<string, string>) => void;
  fileName: string;
  rowCount: number;
  missingRequired: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
        <span className="font-mono text-text-secondary">{fileName}</span>
        <Badge intent="info">{rowCount} rows</Badge>
      </div>
      {missingRequired.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-intent-warning bg-intent-warning-bg border border-intent-warning/30 rounded px-2.5 py-1.5 mb-3">
          <AlertTriangle className="h-3 w-3" />
          Required fields unmapped: {missingRequired.join(", ")}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
            <th className="text-left py-2 pr-3">Field</th>
            <th className="text-left py-2">CSV column</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name} className="border-b border-border-subtle last:border-b-0">
              <td className="py-2 pr-3">
                <span className="text-text-primary">{f.label}</span>
                {f.required && <span className="text-intent-danger ml-1">*</span>}
              </td>
              <td className="py-2">
                <Select
                  value={mapping[f.name] ?? ""}
                  onValueChange={(v) =>
                    onChange({ ...mapping, [f.name]: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger className="h-8 w-60">
                    <SelectValue placeholder="— none —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— none —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewStep({
  fields,
  rows,
  total,
}: {
  fields: readonly ImportField[];
  rows: Record<string, unknown>[];
  total: number;
}) {
  return (
    <div>
      <div className="text-xs text-text-muted mb-3">
        Showing first {rows.length} of {total} rows.
      </div>
      <div className="border border-border rounded-md overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-1 sticky top-0">
              <tr className="border-b border-border text-text-muted">
                {fields.map((f) => (
                  <th key={f.name} className="text-left px-2.5 py-1.5 font-medium">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-b-0">
                  {fields.map((f) => (
                    <td key={f.name} className="px-2.5 py-1.5 text-text-secondary">
                      {String(r[f.name] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DoneStep({
  result,
}: {
  result: {
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; message: string }[];
  };
}) {
  return (
    <div className="py-6 text-center">
      <div className="h-12 w-12 mx-auto rounded-full bg-intent-success-bg text-intent-success flex items-center justify-center">
        <Check className="h-6 w-6" />
      </div>
      <div className="mt-3 text-sm font-medium text-text-primary">
        Import complete
      </div>
      <div className="mt-1 text-xs text-text-muted">
        {result.created} created · {result.updated} updated · {result.skipped} skipped
        {result.errors.length > 0 && ` · ${result.errors.length} errors`}
      </div>
      {result.errors.length > 0 && (
        <ul className="mt-3 text-xs text-intent-danger text-left max-w-md mx-auto max-h-40 overflow-y-auto">
          {result.errors.slice(0, 20).map((e, i) => (
            <li key={i}>
              Row {e.row}: {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
