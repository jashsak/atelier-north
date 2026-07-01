"use client";
import { useState, useCallback } from "react";
import type { ViewBrief } from "./lib/view.js";
import { synthRead } from "./lib/read.js";
import { MaterialCard } from "./components/MaterialCard.js";
import { EmphasizedRead } from "./components/EmphasizedRead.js";
import { SunlitBlindsBackground } from "./components/SunlitBlindsBackground.js";

// Each example is chosen to trigger a distinct capability that answers the brief:
// (1) the confusable-twin safety catch, (2) evidence-backed "how do you know" reasoning,
// (3) honest abstention when the library can't deliver, (4) a qualified match under thin coverage.
const EXAMPLES = [
  "a hard-wearing neutral for a hotel lobby",
  "the most sustainable option, and how do you know?",
  "a deep green velvet",
  "something for a poolside cabana",
];

const chip = {
  fontSize: 12.5, color: "var(--ink-2)", background: "#fff",
  border: "1px solid var(--hair)", borderRadius: 999, padding: "7px 13px", cursor: "pointer",
} as const;

function Spinner() {
  return (
    <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M12 2a10 10 0 0 1 10 10" opacity="0.9" />
    </svg>
  );
}

function QueryInput({ q, setQ, onSubmit, big, loading }: { q: string; setQ: (v: string) => void; onSubmit: (e: React.FormEvent) => void; big?: boolean; loading?: boolean }) {
  return (
    <form onSubmit={onSubmit} style={{ position: "relative", width: "100%" }}>
      <input
        autoFocus value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Describe what you're looking for…"
        style={{
          width: "100%", padding: big ? "17px 84px 17px 18px" : "13px 76px 13px 15px",
          fontSize: big ? 17 : 15, color: "var(--ink)", background: "#fff",
          border: "1px solid var(--hair-2)", borderRadius: "var(--r-control)", outline: "none",
        }}
      />
      <button type="submit" aria-label="Ask" disabled={loading}
        style={{
          position: "absolute", right: 6, top: 6, bottom: 6, padding: "0 14px", fontSize: 12.5,
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          color: q.trim() ? "var(--paper)" : "var(--ink-3)", background: q.trim() ? "var(--ink)" : "transparent",
          border: "1px solid var(--hair-2)", borderRadius: 5, cursor: loading ? "default" : "pointer",
          transition: "background 150ms var(--ease), color 150ms var(--ease)",
        }}>
        {loading ? <Spinner /> : <>Ask&nbsp;↵</>}
      </button>
    </form>
  );
}

export default function Page() {
  const [q, setQ] = useState("");
  const [brief, setBrief] = useState<ViewBrief | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (query: string) => {
    setQ(query); setLoading(true); setBrief(null);
    try {
      const d = await (await fetch(`/api/ask?q=${encodeURIComponent(query)}`)).json();
      const b: ViewBrief = d.brief;
      // Answer-first: wait for the paragraph, then reveal the whole block at once, in order.
      if (d.llm && !b.unclear && !b.abstained) {
        try {
          const dd = await (await fetch(`/api/narrate?q=${encodeURIComponent(query)}`)).json();
          b.read = dd.read ?? null;
        } catch { /* fall back to templated read */ }
      }
      setBrief(b);
    } finally { setLoading(false); }
  }, []);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) run(q.trim()); };
  const active = loading || !!brief;

  // ── the front door ──
  if (!active) {
    return (
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px", position: "relative" }}>
        <SunlitBlindsBackground className="fixed inset-0 z-0" style={{ opacity: 0.75 }} />
        <div className="load-in" style={{ position: "relative", zIndex: 1, minHeight: "84vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <h1 className="font-display" style={{ fontSize: "clamp(42px, 7vw, 68px)", fontWeight: 400, letterSpacing: "-0.01em", margin: 0, lineHeight: 1 }}>
            Atelier North
          </h1>
          <div style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 12, letterSpacing: "0.03em" }}>Internal textile library</div>
          <div style={{ width: "100%", maxWidth: 540, marginTop: 36 }}>
            <QueryInput q={q} setQ={setQ} onSubmit={onSubmit} loading={loading} big />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 18, maxWidth: 620 }}>
            {EXAMPLES.map((ex) => <button key={ex} onClick={() => run(ex)} style={chip}>{ex}</button>)}
          </div>
        </div>
      </main>
    );
  }

  // ── the workspace ──
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 120px" }}>
      <header style={{ marginBottom: 26 }}>
        <button onClick={() => { setBrief(null); setQ(""); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
          <div className="font-display" style={{ fontSize: 22, fontWeight: 400, lineHeight: 1 }}>Atelier North</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>Internal textile library</div>
        </button>
      </header>

      <QueryInput q={q} setQ={setQ} onSubmit={onSubmit} loading={loading} />

      {brief && <Results key={brief.query} brief={brief} onExample={run} />}
    </main>
  );
}

function Results({ brief, onExample }: { brief: ViewBrief; onExample: (q: string) => void }) {
  if (brief.unclear) {
    return (
      <section style={{ marginTop: 30 }}>
        <h2 className="font-display load-in" style={{ fontSize: 27, fontWeight: 400, margin: "0 0 10px", lineHeight: 1.2, textWrap: "balance" }}>I'm not sure what you're specifying yet.</h2>
        <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 16px", textWrap: "pretty" }}>
          Tell me the <em>piece</em>, the <em>space</em>, or the <em>look</em> — durability, fire, colour, fibre, or feel. I'd rather ask than guess.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EXAMPLES.map((ex) => <button key={ex} onClick={() => onExample(ex)} style={chip}>{ex}</button>)}
        </div>
        {brief.notes.length > 0 && (
          <div style={{ marginTop: 20, borderTop: "1px solid var(--hair)", paddingTop: 14 }}>
            {brief.notes.map((n, i) => <p key={i} style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "0 0 6px" }}>· {n}</p>)}
          </div>
        )}
      </section>
    );
  }

  const read = brief.read ?? synthRead(brief);
  const cards = brief.abstained ? brief.nearest : brief.picks;
  const showCoverage = brief.coverage.eligible < brief.coverage.total || !!brief.coverage.binding;
  const cardDelay = 240; // cards settle in after the answer + the "how I read this" line

  return (
    <section style={{ marginTop: 26 }}>
      {/* 1 — the answer, front and centre */}
      {brief.abstained ? (
        <h2 className="font-display load-in" style={{ fontSize: 26, fontWeight: 400, margin: "0 0 14px", lineHeight: 1.2, textWrap: "balance" }}>
          <EmphasizedRead text={read} query={brief.query} />
        </h2>
      ) : (
        <p className="font-display load-in" style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.45, margin: "0 0 16px", textWrap: "balance" }}>
          <EmphasizedRead text={read} query={brief.query} />
        </p>
      )}

      {/* 2 — how I read your brief: the inferred tags + coverage, quiet, beneath the answer */}
      {(brief.chips.length > 0 || showCoverage) && (
        <div className="load-in" style={{ animationDelay: "140ms", marginBottom: 22 }}>
          {brief.chips.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: showCoverage ? 8 : 0 }}>
              {brief.chips.map((c, i) => (
                <span key={i} title={`${c.detail} — ${c.why}`}
                  style={{
                    fontSize: 12, padding: "5px 10px", borderRadius: 6,
                    border: c.kind === "gate" ? "1px solid var(--oxblood)" : "1px solid var(--hair-2)",
                    color: c.kind === "gate" ? "var(--oxblood)" : "var(--ink-2)",
                    background: c.kind === "gate" ? "var(--oxblood-tint)" : "var(--paper-2)",
                  }}>
                  {c.kind === "gate" ? "◆ " : ""}{c.label}<span style={{ opacity: 0.6 }}> · {c.source}</span>
                </span>
              ))}
            </div>
          )}
          {showCoverage && (
            <div className="tnum" style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {brief.coverage.eligible} of {brief.coverage.total} meet these constraints
              {brief.coverage.binding ? <> · binding constraint: {brief.coverage.binding}</> : null}
            </div>
          )}
        </div>
      )}

      {brief.abstained && cards.length > 0 && (
        <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 14px" }}>Closest in hand and colour:</p>
      )}

      {/* 3 — the cards */}
      {cards.length > 0 && (
        <div style={{ display: "grid", gap: 14 }}>
          {cards.map((p, i) => <MaterialCard key={p.id} p={p} index={i} delay={cardDelay} />)}
        </div>
      )}

      {brief.excluded.length > 0 && !brief.abstained && (
        <details style={{ marginTop: 22 }}>
          <summary style={{ fontSize: 12.5, color: "var(--ink-3)", cursor: "pointer" }}>Excluded, with reasons ({brief.excluded.length} shown)</summary>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12.5, color: "var(--ink-2)" }}>
            {brief.excluded.map((e, i) => <li key={i} style={{ marginBottom: 4 }}>{e.name} — {e.reason}</li>)}
          </ul>
        </details>
      )}

      {brief.notes.length > 0 && (
        <div className="load-in" style={{ animationDelay: `${cardDelay + 260}ms`, marginTop: 22, borderTop: "1px solid var(--hair)", paddingTop: 14 }}>
          {brief.notes.map((n, i) => <p key={i} style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "0 0 6px", lineHeight: 1.5, textWrap: "pretty" }}>· {n}</p>)}
        </div>
      )}
    </section>
  );
}
