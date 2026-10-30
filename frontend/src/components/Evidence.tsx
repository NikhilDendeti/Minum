import { Fragment, useId, useState } from "react";
import { useMunim } from "../hooks/useMunim";
import { fmt } from "../lib/i18n";
import type { Evidence as EvidenceData } from "../types";
import { Disclosure, Icon } from "./ui";

const KEYWORD =
  /\b(?:SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|LEFT|INNER|ON|AS|AND|OR|NOT|IN|IS|NULL|COUNT|SUM|AVG|MIN|MAX|LIMIT|DESC|ASC|HAVING|DISTINCT|BETWEEN|CASE|WHEN|THEN|ELSE|END|WITH|UNION|INTERVAL|CURRENT_DATE)\b/i;
const TOKEN = new RegExp(`(${KEYWORD.source}|'[^']*'|\\b\\d+(?:\\.\\d+)?\\b)`, "gi");

/** Colours the query for reading. The text itself is untouched: what is shown is exactly what ran. */
export function Sql({ sql }: { sql: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-ctl bg-navy p-3 font-mono text-[12.5px] leading-relaxed text-[#e6eefb]" lang="en" tabIndex={0}>
      {sql.split(TOKEN).map((part, i) => {
        if (!part) return null;
        if (KEYWORD.test(part) && /^[A-Za-z_ ]+$/.test(part)) return <span key={i} className="font-semibold text-[#7fd3f0]">{part}</span>;
        if (part.startsWith("'")) return <span key={i} className="text-[#f2c879]">{part}</span>;
        if (/^\d/.test(part)) return <span key={i} className="text-[#9ad7b5]">{part}</span>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </pre>
  );
}

const PREVIEW_ROWS = 8;

/** The exact query and rows behind an answer. Collapsed by default: most merchants need the answer, not the SQL. */
export default function Evidence({ evidence }: { evidence: EvidenceData }) {
  const { t } = useMunim();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const panel = useId();

  if (!evidence.sql) return <p className="meta">{t.evidenceNone}</p>;

  const rows = evidence.rows ?? [];
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  const shown = all ? rows : rows.slice(0, PREVIEW_ROWS);

  return (
    <div>
      <p className="meta">{rows.length === 0 ? t.evidenceEmpty : fmt(rows.length === 1 ? t.evidenceOne : t.evidenceMany, { n: rows.length })}</p>
      <button
        className="btn-quiet -ml-3 min-h-[44px] py-1 text-[14px]"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panel}
      >
        <Icon name="chevron" className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        {open ? t.hideEvidence : t.viewEvidence}
      </button>
      <Disclosure open={open} id={panel}>
        <div className="space-y-3 pb-1">
          <div>
            <p className="meta mb-1">{t.queryRun}</p>
            <Sql sql={evidence.sql} />
          </div>
          <div>
            <p className="meta mb-1">{t.queryRows}</p>
            {rows.length === 0 ? (
              <p className="rounded-ctl border border-line bg-canvas p-3 text-[14px] text-muted">{t.evidenceEmptyBody}</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-ctl border border-line" tabIndex={0} role="region" aria-label={t.queryRows}>
                  <table className="w-full border-collapse text-[13px]">
                    <thead className="bg-canvas">
                      <tr>
                        {columns.map((c) => (
                          <th key={c} scope="col" className="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold" lang="en">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((row, i) => (
                        <tr key={i} className="border-b border-line last:border-0">
                          {columns.map((c) => (
                            <td key={c} className="num whitespace-nowrap px-3 py-1.5 font-mono text-[12.5px]">
                              {row[c] === null || row[c] === undefined ? "—" : String(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > PREVIEW_ROWS && (
                  <button className="btn-quiet -ml-3 min-h-[44px] py-1 text-[14px]" onClick={() => setAll((a) => !a)}>
                    {all ? t.showFewerRows : fmt(t.showAllRows, { n: rows.length })}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </Disclosure>
    </div>
  );
}
