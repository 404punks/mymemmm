import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Outfit } from "next/font/google";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import "./globals.css";

const display = Outfit({ subsets: ["latin"], variable: "--font-display" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "NEURALPAD", template: "%s · NEURALPAD" },
  description: "The intelligence layer for tokens. Index public AI systems, shape assistant profiles, and launch Solana tokens through the official Pump program.",
  metadataBase: new URL(process.env.PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "NEURALPAD",
    description: "Ideas become agents. Agents become on-chain.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
