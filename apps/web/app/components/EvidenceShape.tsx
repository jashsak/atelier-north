// The confidence/evidence-shape: interrogable, not a fake %. Shows what the
// recommendation rests on — tested / spec / inferred / missing / conflicted.
const STYLE: Record<string, { sym: string; color: string; title: string }> = {
  tested: { sym: "●", color: "var(--ok)", title: "lab-tested spec" },
  spec: { sym: "●", color: "var(--ink-2)", title: "manufacturer spec" },
  inferred: { sym: "◐", color: "var(--ink-3)", title: "inferred" },
  missing: { sym: "○", color: "var(--ink-3)", title: "not recorded" },
  conflicted: { sym: "▲", color: "var(--oxblood)", title: "label vs swatch conflict" },
};

export function EvidenceShape({ shape }: { shape: { label: string; strength: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
      {shape.map((g, i) => {
        const s = STYLE[g.strength] ?? STYLE.spec!;
        return (
          <span key={i} title={`${g.label}: ${s.title}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em" }}>
            <span style={{ color: s.color, fontSize: 9 }}>{s.sym}</span>
            <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{g.label}</span>
          </span>
        );
      })}
    </div>
  );
}
