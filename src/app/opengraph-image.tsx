import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0C1022", color: "#F4EFE6", padding: 72, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 720 }}>
          <div style={{ fontSize: 28, color: "#8F8BF5" }}>VEIL</div>
          <div style={{ fontSize: 68, lineHeight: 1, marginTop: 16 }}>Hold the coin. Read the character.</div>
          <div style={{ fontSize: 24, color: "#9AA3C7", marginTop: 24 }}>Mainnet pump.fun launches with a sealed four-chapter mystery.</div>
        </div>
        <div style={{ position: "absolute", right: 90, top: 150, width: 280, height: 280, borderRadius: 999, border: "4px solid #F2B84B", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: 999, background: "#8F8BF5" }} />
        </div>
      </div>
    ),
    size,
  );
}
