import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#07090f", color: "#e7edf4", padding: 64 }}>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6 }}>NEURALPAD</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, maxWidth: 900 }}>Ideas become agents. Agents become on-chain.</div>
          <div style={{ fontSize: 28, color: "#93a0b3" }}>The intelligence layer for tokens.</div>
        </div>
        <div style={{ display: "flex", gap: 18, color: "#3ee0ff", fontSize: 22 }}>Public index · Pump program · You sign</div>
      </div>
    ),
    size,
  );
}
