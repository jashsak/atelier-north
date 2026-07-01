"use client";
import { useState } from "react";
import type { ViewPick } from "../lib/view.js";
import { Swatch } from "./Swatch.js";
import { EvidenceShape } from "./EvidenceShape.js";

// Vertically-stacked card: swatch left, content right. "See the evidence" expands
// the full record inline, in place — no separate panel, no scrolling away.
export function MaterialCard({ p, index, delay = 0 }: { p: ViewPick; index: number; delay?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <article
      className="load-in"
      style={{
        animationDelay: `${delay + index * 70}ms`,
        background: "var(--raised)", border: "1px solid var(--hair)", borderRadius: "var(--r-card)",
        padding: 16, display: "grid", gridTemplateColumns: "96px 1fr", gap: 16,
      }}
    >
      <Swatch hex={p.swatch.hex} image={p.swatch.image} alt={`${p.name} — ${p.swatch.name}`} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <h3 className="font-display" style={{ margin: 0, fontSize: 21, fontWeight: 400, lineHeight: 1.1 }}>{p.name}</h3>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.brand} · {p.swatch.name}</span>
        </div>

        <div style={{ marginTop: 8, fontSize: 14, color: "var(--ink)", display: "flex", gap: 7 }}>
          <span style={{ color: "var(--ok)" }}>✓</span><span>{p.earnedBy}</span>
        </div>

        <EvidenceShape shape={p.evidenceShape} />

        {p.tradeoff && (
          <p style={{ margin: "10px 0 0", fontSize: 13, fontStyle: "italic", color: "var(--ink-2)" }}>Trade-off: {p.tradeoff}</p>
        )}
        {p.hazards.map((h, i) => (
          <p key={i} style={{ margin: "10px 0 0", fontSize: 13, color: "var(--oxblood)", background: "var(--oxblood-tint)", padding: "7px 10px", borderRadius: 4, borderLeft: "2px solid var(--oxblood)" }}>⚠ {h.message}</p>
        ))}
        {p.conflicts.map((c, i) => (
          <p key={i} style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--amber)", background: "var(--amber-tint)", padding: "6px 10px", borderRadius: 4 }}>⚑ {c.message}</p>
        ))}

        <button onClick={() => setOpen((v) => !v)}
          style={{ marginTop: 12, background: "none", border: "none", padding: 0, fontSize: 12, color: "var(--ink-2)", textDecoration: "underline", textUnderlineOffset: 3 }}>
          {open ? "Hide evidence" : "See the evidence"}
        </button>

        {open && (
          <div className="panel-in" style={{ marginTop: 12, borderTop: "1px solid var(--hair)", paddingTop: 12 }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, textWrap: "pretty" }}>{p.description}</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {p.claims.map((c) => (
                  <tr key={c.key} style={{ borderTop: "1px solid var(--hair)" }}>
                    <td style={{ padding: "6px 0", color: "var(--ink-2)", width: 130, verticalAlign: "top" }}>{c.label}</td>
                    <td className="tnum" style={{ padding: "6px 0", color: c.strength === "conflicted" ? "var(--oxblood)" : "var(--ink)" }}>
                      {c.value}<span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)" }}>· {c.provenance}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {p.colorways.map((c) => (
                <div key={c.name} style={{ textAlign: "center" }}>
                  <Swatch hex={c.hex} image={c.image} alt={c.name} style={{ width: 52 }} />
                  <div style={{ fontSize: 10.5, color: c.labelConflict ? "var(--amber)" : "var(--ink-3)", marginTop: 4 }}>{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
