import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Download, ChevronRight,
} from 'lucide-react';
import {
  DEFAULT_CDO_ID,
  defaultTokenExpiry,
  findDuplicateSignups,
  inferCdoFromZip,
  LOCATIONS,
  normalizeEmail,
} from '@/data/mockData';
import type { ShirtSize, StoredSignup, User } from '@/data/mockData';
import { logAuditEvent } from '@/lib/auditLog';

/**
 * Bulk CSV import for the Signups admin page.
 *
 * Flow:
 *   1. Admin clicks "Import CSV" → modal opens
 *   2. Drag-drop or pick a file
 *   3. We parse + validate every row, show a preview list with green/red
 *      chips per row (Valid / Missing email / Duplicate of existing / etc.)
 *   4. Admin clicks "Import N valid rows" → bulk-insert with one audit
 *      event PER row (granular trail, not a single summary entry)
 *
 * Expected CSV columns (matches the export format produced by /signups):
 *   Name, Email, Phone, ZIP, CDO, First Time?, Shirt, Emergency Name,
 *   Emergency Phone, Notes, Submitted
 *
 * Each imported signup gets a fresh editToken (so the original volunteers
 * can be sent magic links via the resend flow). Original submittedAt is
 * preserved if the column is present; otherwise stamped now.
 */

export interface ParsedRow {
  raw: Record<string, string>;
  errors: string[];
  warnings: string[];
  signup?: StoredSignup;
}

export default function BulkImportDialog({
  open, onClose, onImport, existingSignups, actor,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (signups: StoredSignup[], sourceFilename: string) => void;
  existingSignups: StoredSignup[];
  actor: User | null;
}) {
  const [filename, setFilename] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = useMemo(() => parsed.filter((r) => r.errors.length === 0), [parsed]);
  const errorRows = useMemo(() => parsed.filter((r) => r.errors.length > 0), [parsed]);

  function handleFile(file: File) {
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const rows = parseCSV(text);
      const validated = rows.map((row) => validateRow(row, existingSignups));
      setParsed(validated);
    };
    reader.onerror = () => {
      setParsed([{ raw: {}, errors: ['Could not read this file'], warnings: [] }]);
    };
    reader.readAsText(file);
  }

  function reset() {
    setFilename(null);
    setParsed([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function performImport() {
    if (validRows.length === 0) return;
    const signups = validRows.map((r) => r.signup!).filter(Boolean);
    onImport(signups, filename ?? 'import.csv');
    if (actor) {
      logAuditEvent(
        { id: actor.id, name: actor.name, role: actor.role },
        'volunteer_signup_created',
        `bulk-import:${filename}`,
        `Bulk-imported ${signups.length} signups from ${filename}'`,
      );
      // Per-row audit entries so the trail is granular
      for (const s of signups) {
        logAuditEvent(
          { id: actor.id, name: actor.name, role: actor.role },
          'volunteer_signup_created',
          `signup:${s.id}`,
          `Imported from ${filename}: ${s.name} (${s.email})`,
        );
      }
    }
    reset();
    onClose();
  }

  function downloadTemplate() {
    const header = 'Name,Email,Phone,ZIP,CDO,First Time?,Shirt,Emergency Name,Emergency Phone,Notes,Submitted';
    const example = 'Jane Sample,jane@example.org,(555) 123-4567,30301,cdo1,Yes,M,John Sample,(555) 987-6543,Bringing my kids,2026-11-01';
    const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'occ-signup-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-navy/50 flex items-center justify-center px-4"
        onClick={() => { reset(); onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-bg-card rounded-3xl shadow-card-elevated max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden"
        >
          <header className="px-6 py-4 border-b border-border-custom flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-light flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-purple-accent" />
              </div>
              <div>
                <h2 className="font-display text-lg text-ink">Bulk Import Signups</h2>
                <p className="text-[11px] text-ink-light italic">
                  Drop a CSV from last year, a roster from another tool, or the export template.
                </p>
              </div>
            </div>
            <button
              onClick={() => { reset(); onClose(); }}
              className="touch-target text-ink-light/60 hover:text-sp-red transition-colors"
              aria-label="Close import dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {parsed.length === 0 ? (
              <DropZone
                dragging={dragging}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onPick={() => fileInputRef.current?.click()}
                onDownloadTemplate={downloadTemplate}
              />
            ) : (
              <>
                <SummaryBar
                  total={parsed.length}
                  valid={validRows.length}
                  errors={errorRows.length}
                  filename={filename}
                />
                <ul className="space-y-1.5">
                  {parsed.slice(0, 100).map((row, i) => (
                    <RowPreview key={i} row={row} index={i} />
                  ))}
                  {parsed.length > 100 && (
                    <li className="text-center text-xs text-ink-light italic py-2">
                      … and {parsed.length - 100} more rows
                    </li>
                  )}
                </ul>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          <footer className="px-6 py-4 border-t border-border-custom flex items-center justify-between gap-3 flex-wrap bg-bg-primary">
            <p className="text-[11px] text-ink-light italic">
              Each imported row is logged separately in the audit trail.
            </p>
            <div className="flex items-center gap-2">
              {parsed.length > 0 && (
                <button
                  onClick={reset}
                  className="h-10 px-4 bg-bg-card border border-border-custom hover:border-ink text-ink-light hover:text-ink text-xs font-bold rounded-xl uppercase tracking-wider transition-all"
                >
                  Start over
                </button>
              )}
              <button
                onClick={performImport}
                disabled={validRows.length === 0}
                className="h-10 px-5 bg-occ-green hover:bg-occ-green-dark text-white text-xs font-bold rounded-xl flex items-center gap-1.5 uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-3.5 h-3.5" />
                Import {validRows.length} row{validRows.length === 1 ? '' : 's'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── DropZone ─────────────────────────────────────────────────────────────
function DropZone({
  dragging, onDragOver, onDragLeave, onDrop, onPick, onDownloadTemplate,
}: {
  dragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onPick: () => void;
  onDownloadTemplate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onPick}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-occ-green bg-occ-green-light/50'
            : 'border-border-custom hover:border-occ-green/60 bg-bg-primary'
        }`}
      >
        <div className="w-16 h-16 mx-auto bg-purple-light rounded-full flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-purple-accent" />
        </div>
        <p className="font-display text-base text-ink">Drop a CSV here</p>
        <p className="text-xs text-ink-light italic mt-1">or click to browse · .csv files only</p>
      </div>

      <div className="bg-blue-light rounded-xl p-4 flex items-start gap-3 text-xs text-ink">
        <FileSpreadsheet className="w-4 h-4 text-blue-accent shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold">Expected columns:</p>
          <p className="text-ink-light italic mt-1 leading-relaxed">
            Name, Email, Phone, ZIP, CDO, First Time?, Shirt, Emergency Name,
            Emergency Phone, Notes, Submitted
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onDownloadTemplate(); }}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-accent uppercase tracking-wider hover:underline"
          >
            <Download className="w-3 h-3" />
            Download template
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────
function SummaryBar({
  total, valid, errors, filename,
}: {
  total: number; valid: number; errors: number; filename: string | null;
}) {
  return (
    <div className="bg-bg-primary rounded-2xl border border-border-custom p-4">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-light">
            {filename ?? 'parsed file'}
          </p>
          <p className="font-display text-2xl text-ink leading-none mt-1">
            {total} {total === 1 ? 'row' : 'rows'} parsed
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-occ-green-light rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 text-occ-green mb-1" />
          <p className="font-display text-xl text-occ-green tabular-nums leading-none">{valid}</p>
          <p className="text-[10px] text-ink-light uppercase tracking-wider mt-1">Ready to import</p>
        </div>
        <div className={`rounded-xl p-3 ${errors > 0 ? 'bg-sp-red-light' : 'bg-bg-card border border-border-custom'}`}>
          <AlertTriangle className={`w-4 h-4 mb-1 ${errors > 0 ? 'text-sp-red' : 'text-ink-light/40'}`} />
          <p className={`font-display text-xl tabular-nums leading-none ${errors > 0 ? 'text-sp-red' : 'text-ink-light/40'}`}>{errors}</p>
          <p className="text-[10px] text-ink-light uppercase tracking-wider mt-1">Need attention</p>
        </div>
      </div>
    </div>
  );
}

// ─── Row preview ─────────────────────────────────────────────────────────
function RowPreview({ row, index }: { row: ParsedRow; index: number }) {
  const hasError = row.errors.length > 0;
  return (
    <li className={`flex items-start gap-3 p-3 rounded-xl border ${
      hasError ? 'border-sp-red/30 bg-sp-red-light/30' : 'border-occ-green/30 bg-occ-green-light/30'
    }`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
        hasError ? 'bg-sp-red text-white' : 'bg-occ-green text-white'
      }`}>
        {hasError ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold text-ink truncate">
            <span className="text-ink-light/60 mr-2">#{index + 1}</span>
            {row.raw.Name || row.raw.name || '(missing name)'}
          </p>
          <span className="text-[10px] font-mono text-ink-light/60">
            {row.raw.Email || row.raw.email || '(no email)'}
          </span>
        </div>
        {row.errors.map((err, i) => (
          <p key={`e${i}`} className="text-[11px] text-sp-red font-semibold mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {err}
          </p>
        ))}
        {row.warnings.map((w, i) => (
          <p key={`w${i}`} className="text-[11px] text-gold italic mt-1">
            {w}
          </p>
        ))}
      </div>
    </li>
  );
}

// ─── Parser ──────────────────────────────────────────────────────────────
// Lightweight CSV parser — handles quoted fields with embedded commas/quotes/newlines.
function parseCSV(text: string): Array<Record<string, string>> {
  const trimmed = text.replace(/^\ufeff/, ''); // strip BOM
  const lines: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inQuotes) {
      if (c === '"') {
        if (trimmed[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        current.push(cell);
        cell = '';
      } else if (c === '\n' || c === '\r') {
        if (cell || current.length > 0) {
          current.push(cell);
          lines.push(current);
          current = [];
          cell = '';
        }
        if (c === '\r' && trimmed[i + 1] === '\n') i++;
      } else {
        cell += c;
      }
    }
  }
  if (cell || current.length > 0) {
    current.push(cell);
    lines.push(current);
  }

  if (lines.length === 0) return [];
  const [header, ...rest] = lines;
  return rest
    .filter((row) => row.some((c) => c.trim().length > 0))
    .map((row) => {
      const rec: Record<string, string> = {};
      header.forEach((h, idx) => {
        rec[h.trim()] = (row[idx] ?? '').trim();
      });
      return rec;
    });
}

// ─── Row validator ───────────────────────────────────────────────────────
function validateRow(raw: Record<string, string>, existing: StoredSignup[]): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = (raw.Name ?? raw.name ?? '').trim();
  const email = (raw.Email ?? raw.email ?? '').trim();
  const phone = (raw.Phone ?? raw.phone ?? '').trim();
  const zip = (raw.ZIP ?? raw.zip ?? '').trim();
  const cdo = (raw.CDO ?? raw.cdo ?? raw.LocationId ?? raw.locationId ?? '').trim();
  const firstTimeRaw = (raw['First Time?'] ?? raw.firstTime ?? '').trim().toLowerCase();
  const shirt = (raw.Shirt ?? raw.shirt ?? raw.ShirtSize ?? '').trim().toUpperCase();
  const emergencyName = (raw['Emergency Name'] ?? raw.emergencyName ?? '').trim();
  const emergencyPhone = (raw['Emergency Phone'] ?? raw.emergencyPhone ?? '').trim();
  const notes = (raw.Notes ?? raw.notes ?? '').trim();
  const submittedRaw = (raw.Submitted ?? raw.submitted ?? '').trim();

  if (!name) errors.push('Name is required');
  if (!email) errors.push('Email is required');
  if (email && !email.includes('@')) errors.push('Email looks invalid');
  if (!phone) errors.push('Phone is required');

  // Duplicate detection — non-blocking warning
  if (email && phone) {
    const dupes = findDuplicateSignups(existing, { email, phone });
    if (dupes.length > 0) {
      warnings.push(`Possible duplicate of existing signup (${dupes[0].name})`);
    }
  }

  // CDO normalization
  let locationId = cdo;
  if (!locationId || !LOCATIONS.find((l) => l.id === locationId)) {
    // Try matching by name
    const byName = LOCATIONS.find(
      (l) => l.name.toLowerCase() === cdo.toLowerCase(),
    );
    if (byName) {
      locationId = byName.id;
    } else if (zip) {
      locationId = inferCdoFromZip(zip);
      warnings.push(`CDO not specified; auto-routed to ${LOCATIONS.find((l) => l.id === locationId)?.name ?? locationId} based on ZIP`);
    } else {
      locationId = DEFAULT_CDO_ID;
      warnings.push(`CDO not specified; defaulted to ${LOCATIONS.find((l) => l.id === DEFAULT_CDO_ID)?.name ?? DEFAULT_CDO_ID}`);
    }
  }

  // Shirt size — coerce
  const validShirts: ShirtSize[] = ['S', 'M', 'L', 'XL', 'XXL'];
  const shirtSize: ShirtSize | '' = (validShirts as string[]).includes(shirt) ? (shirt as ShirtSize) : '';

  // First-time
  const firstTime = firstTimeRaw === 'yes' || firstTimeRaw === 'y' || firstTimeRaw === 'true'
    ? true
    : firstTimeRaw === 'no' || firstTimeRaw === 'n' || firstTimeRaw === 'false'
    ? false
    : null;

  // Submitted timestamp
  let submittedAt = new Date().toISOString();
  if (submittedRaw) {
    const parsed = new Date(submittedRaw);
    if (!isNaN(parsed.getTime())) submittedAt = parsed.toISOString();
    else warnings.push(`Submitted date "${submittedRaw}" could not be parsed; using now`);
  }

  if (errors.length > 0) {
    return { raw, errors, warnings };
  }

  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? `s_${crypto.randomUUID().slice(0, 8)}`
      : `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const editToken =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tok_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

  const signup: StoredSignup = {
    id,
    name,
    email: normalizeEmail(email),
    phone,
    zip: zip || undefined,
    locationId,
    firstTime,
    shirtSize,
    emergencyName,
    emergencyPhone,
    notes,
    submittedAt,
    editToken,
    editTokenExpiresAt: defaultTokenExpiry(submittedAt),
  };

  return { raw, errors, warnings, signup };
}
