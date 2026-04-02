/**
 * ImportSheet — CSV upload dialog for Leads, Members, or Team.
 *
 * Parses the CSV client-side, sends rows to the appropriate server action,
 * then displays an import result report (imported count + skipped rows).
 *
 * Expected CSV columns per entity type:
 *   Leads:   displayName, phone, email (opt), interestedPrograms (opt, comma-separated)
 *   Members: displayName, phone, email (opt), memberSince (opt), programsDone (opt), interestedPrograms (opt)
 *   Team:    displayName, email, phone (opt)
 */
import { createSignal, Show, type Component } from "solid-js";
import { useAction } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { importLeadsAction, importMembersAction, importTeamAction } from "~/server/api";
import type { ImportResult } from "~/server/services/import.service";

export type ImportEntityType = "leads" | "members" | "team";

interface ImportSheetProps {
  entityType: ImportEntityType;
  onClose: () => void;
}

const TEMPLATES: Record<ImportEntityType, { headers: string[]; example: string[] }> = {
  leads: {
    headers: ["displayName", "phone", "email", "interestedPrograms"],
    example: ["Priya Sharma", "+919876543210", "priya@example.com", "Yoga 101,Meditation Basics"],
  },
  members: {
    headers: ["displayName", "phone", "email", "memberSince", "programsDone", "interestedPrograms"],
    example: ["Rahul Gupta", "+919812345678", "rahul@example.com", "2024-01-15", "Yoga 101", "Advanced Yoga"],
  },
  team: {
    headers: ["displayName", "email", "phone"],
    example: ["Anjali Singh", "anjali@example.com", "+919988776655"],
  },
};

const ENTITY_LABELS: Record<ImportEntityType, string> = {
  leads: "Leads",
  members: "Members",
  team: "Team",
};

/** Minimal CSV parser — handles quoted fields with embedded commas. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.match(/("(?:[^"]|"")*"|[^,]*)/g) ?? [];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").trim().replace(/^"|"$/g, "").replace(/""/g, '"');
    });
    return row;
  });
}

export const ImportSheet: Component<ImportSheetProps> = (props) => {
  const [file, setFile] = createSignal<File | null>(null);
  const [isImporting, setIsImporting] = createSignal(false);
  const [result, setResult] = createSignal<ImportResult | null>(null);
  const [parseError, setParseError] = createSignal<string | null>(null);

  const doImportLeads = useAction(importLeadsAction);
  const doImportMembers = useAction(importMembersAction);
  const doImportTeam = useAction(importTeamAction);

  const template = () => TEMPLATES[props.entityType];
  const label = () => ENTITY_LABELS[props.entityType];

  const downloadTemplate = () => {
    const t = template();
    const csv = [t.headers.join(","), t.example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${props.entityType}-import-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    setFile(input.files?.[0] ?? null);
    setResult(null);
    setParseError(null);
  };

  const handleImport = async () => {
    const f = file();
    if (!f) return;

    setIsImporting(true);
    setParseError(null);
    setResult(null);

    try {
      const text = await f.text();
      const rawRows = parseCsv(text);

      if (rawRows.length === 0) {
        setParseError("CSV is empty or has no data rows.");
        return;
      }

      const rows = rawRows.map((r, i) => ({ ...r, row: i + 2 })); // row 1 = header, data starts at 2

      let importResult: ImportResult;
      if (props.entityType === "leads") {
        importResult = await doImportLeads(rows as any);
      } else if (props.entityType === "members") {
        importResult = await doImportMembers(rows as any);
      } else {
        importResult = await doImportTeam(rows as any);
      }

      setResult(importResult);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card class="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>Import {label()}</CardTitle>
            <button
              type="button"
              onClick={props.onClose}
              class="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          {/* Template download */}
          <div class="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            <p class="mb-2">
              Required columns:{" "}
              <span class="font-mono text-xs">{template().headers.join(", ")}</span>
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              ⬇ Download template CSV
            </Button>
          </div>

          {/* File picker */}
          <div>
            <label class="block text-sm font-medium mb-1">Select CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              class="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-border file:text-sm file:bg-muted file:cursor-pointer"
            />
          </div>

          {/* Error */}
          <Show when={parseError()}>
            <p class="text-sm text-destructive">{parseError()}</p>
          </Show>

          {/* Result */}
          <Show when={result()}>
            {(r) => (
              <div class="space-y-3">
                <div class="flex gap-3">
                  <Badge variant="default">{r().imported} imported</Badge>
                  <Show when={r().skipped.length > 0}>
                    <Badge variant="error">{r().skipped.length} skipped</Badge>
                  </Show>
                </div>
                <Show when={r().skipped.length > 0}>
                  <div class="rounded-md border border-destructive/30 bg-destructive/5 p-3 max-h-48 overflow-y-auto">
                    <p class="text-xs font-medium mb-2 text-destructive">Skipped rows:</p>
                    <ul class="space-y-1">
                      {r().skipped.map((s) => (
                        <li class="text-xs text-muted-foreground">
                          Row {s.row}: <span class="font-mono">{s.value}</span> — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Show>
              </div>
            )}
          </Show>

          {/* Actions */}
          <div class="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={props.onClose}>
              {result() ? "Close" : "Cancel"}
            </Button>
            <Show when={!result()}>
              <Button
                onClick={handleImport}
                disabled={!file() || isImporting()}
              >
                {isImporting() ? "Importing…" : `Import ${label()}`}
              </Button>
            </Show>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
