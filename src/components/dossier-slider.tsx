"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const CHAPTERS = [
  { at: 0, title: "Chapter one is the door", body: "Anyone can read the opening. It names the character and stops before the secret." },
  { at: 100000, title: "Chapter two unseals", body: "A wallet holding 100,000 of the coin can read the second movement. Sell below the line and it seals again." },
  { at: 500000, title: "Chapter three unseals", body: "Half a million tokens opens the third chapter. The count is the live token balance, not a badge that sticks." },
  { at: 1000000, title: "Chapter four unseals", body: "One million tokens opens the last chapter written at launch. Later chapters appear only after a real holder milestone." },
];

export function DossierSlider() {
  const [holding, setHolding] = useState(0);
  const reduce = useReducedMotion();
  const open = CHAPTERS.filter((chapter) => holding >= chapter.at);
  return (
    <aside className="panel" style={{ padding: 18 }} aria-label="Example of how a holding unseals chapters. This card is not a launched coin.">
      <h2 className="font-display" style={{ fontFamily: "var(--font-display), serif", fontSize: 28, margin: "8px 0" }}>What a dossier does</h2>
      <p className="muted">This slider is an example. It is not a launched coin.</p>
      <label className="muted" htmlFor="holding">Holding {holding.toLocaleString()} tokens</label>
      <input id="holding" type="range" min={0} max={1000000} step={10000} value={holding} onChange={(event) => setHolding(Number(event.target.value))} style={{ width: "100%" }} />
      <div className="grid" style={{ gap: 10, marginTop: 12 }}>
        {CHAPTERS.map((chapter) => {
          const sealed = holding < chapter.at;
          return (
            <article key={chapter.title} className="panel" style={{ padding: 12 }}>
              <h3 style={{ margin: 0 }}>{chapter.title}</h3>
              {sealed ? (
                <p style={{ marginBottom: 0 }}>Sealed until the holding reaches {chapter.at.toLocaleString()} tokens.</p>
              ) : (
                <motion.p
                  className="muted"
                  style={{ marginBottom: 0 }}
                  initial={reduce ? false : { filter: "blur(8px)" }}
                  animate={{ filter: "blur(0px)" }}
                  transition={{ duration: 0.35 }}
                >
                  {chapter.body}
                </motion.p>
              )}
            </article>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>{open.length} of 4 chapters readable at this holding.</p>
    </aside>
  );
}
