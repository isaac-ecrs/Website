import { useState, useRef, useCallback } from 'react';
import { MemberLocationAccumulator } from './memberLocationsParser';
import type { ParseResult } from './memberLocationsParser';

interface Props {
  onResult: (result: ParseResult) => void;
}

export default function MemberLocationsUploader({ onResult }: Props) {
  const [accumulator] = useState(() => new MemberLocationAccumulator());
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const isXlsx = file.name.endsWith('.xlsx');
      const isCsv = file.name.endsWith('.csv');
      if (!isXlsx && !isCsv) {
        setError('Please upload .xlsx (Cognito) or .csv (Mailchimp) files.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        if (isXlsx) {
          accumulator.ingest(buffer);
        } else {
          accumulator.ingestCsv(buffer);
        }
        const parsed = accumulator.finalise();
        setFiles((prev) => [...prev, file.name]);
        setResult(parsed);
        onResult(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error reading file.');
      } finally {
        setLoading(false);
      }
    },
    [accumulator, onResult]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      Array.from(e.dataTransfer.files).forEach((file) => processFile(file));
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files ?? []);
      picked.forEach((file) => processFile(file));
      e.target.value = '';
    },
    [processFile]
  );

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ generatedAt: result.generatedAt, cities: result.cities }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member-locations.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-8 py-10 text-center transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 bg-gray-50 hover:border-primary/40 dark:bg-slate-700/40'
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.csv" multiple className="hidden" onChange={handleChange} />
        {loading ? (
          <p className="text-muted text-sm">Parsing…</p>
        ) : (
          <>
            <p className="font-medium text-default text-sm">
              {files.length > 0
                ? 'Drop another file to add more data'
                : 'Drop Cognito export (.xlsx) or Mailchimp export (.csv)'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {files.length > 0
                ? 'Emails are deduped across all uploads — event data wins over Mailchimp'
                : 'or click to browse'}
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Uploaded files list */}
      {files.length > 0 && (
        <ul className="text-xs text-muted space-y-0.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="text-green-600 dark:text-green-400">✓</span> {f}
            </li>
          ))}
        </ul>
      )}

      {/* Stats + download */}
      {result && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-slate-800">
          <div className="text-sm text-muted space-y-0.5">
            <span className="font-medium text-default">{result.stats.uniqueEmails.toLocaleString()}</span> unique
            attendees · <span className="font-medium text-default">{result.cities.length}</span> locations
            {result.stats.skipped > 0 && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                ({result.stats.skipped} skipped — no address)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={downloadJson}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Download JSON
          </button>
        </div>
      )}
    </div>
  );
}
