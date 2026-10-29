import type { Evidence } from "../types";

/** "How I worked this out": the exact query and rows behind every number. Collapsed by default. */
export default function SqlPanel({ evidence, label }: { evidence: Evidence; label: string }) {
  if (!evidence.sql) return null;
  const columns = evidence.rows[0] ? Object.keys(evidence.rows[0]) : [];
  return (
    <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50 text-xs">
      <summary className="px-3 py-1.5 font-medium text-slate-600">{label} ▾</summary>
      <div className="space-y-2 px-3 pb-3">
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-navy p-2 font-mono text-[11px] leading-snug text-sky-100">
          {evidence.sql}
        </pre>
        {columns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="border-b border-slate-200 px-1.5 py-1 text-left font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evidence.rows.slice(0, 8).map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c} className="border-b border-slate-100 px-1.5 py-1 font-mono">
                        {String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {evidence.rows.length > 8 && <p className="pt-1 text-slate-400">+ {evidence.rows.length - 8} more rows</p>}
          </div>
        )}
      </div>
    </details>
  );
}
