/** Field-path picker — replaces the "type field name" input on
 *  notification rules + workflow filters. Lists the resource's known
 *  field keys (custom field metadata + sample-record discovery) as a
 *  `<datalist>` so operators can both autocomplete and type a custom
 *  path (e.g. a yet-to-be-recorded value).
 *
 *  Why a datalist over a custom popover: native autocomplete on text
 *  inputs is keyboard-friendly, screenreader-correct, and degrades to
 *  free-form when the user types a path that isn't in the list. The
 *  combobox/listbox flavour the other pickers use is overkill for a
 *  typed value where partial matches matter more than exact pick.
 *
 *  The picker is passive on `resource === undefined` — falls back to
 *  the same free-text input it replaces. Callers gate on having a
 *  resource selected. */

import * as React from "react";
import { useUiFields } from "../../runtime/useUiMetadata";
import { Input } from "../../primitives/Input";

export interface FieldPathPickerProps {
  resource: string | undefined;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Extra suggestions on top of the registry (e.g. context paths
   *  like `previous.<field>` or `trigger.record.<field>`). */
  extraSuggestions?: ReadonlyArray<string>;
}

export function FieldPathPicker({
  resource,
  value,
  onChange,
  placeholder = "field name",
  className,
  id,
  extraSuggestions = [],
}: FieldPathPickerProps): React.ReactElement {
  const { data: fields } = useUiFields(resource);
  // Stable id so the datalist binds even when the resource changes.
  const reactId = React.useId();
  const listId = `fld-${reactId}`;
  const seenKeys = React.useMemo(() => {
    const set = new Set<string>();
    for (const f of fields) set.add(f.key);
    for (const e of extraSuggestions) set.add(e);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [fields, extraSuggestions]);

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={["font-mono text-xs", className].filter(Boolean).join(" ")}
        autoComplete="off"
      />
      <datalist id={listId}>
        {seenKeys.map((k) => {
          const meta = fields.find((f) => f.key === k);
          return (
            <option key={k} value={k}>
              {meta?.label ? `${meta.label} (${meta.kind ?? "unknown"})` : meta?.kind ?? ""}
            </option>
          );
        })}
      </datalist>
    </>
  );
}
