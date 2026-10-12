import { TokenScreen } from "@/components/trade-panel";

export const metadata = { title: "Token" };

export default async function TokenPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  return <TokenScreen mint={decodeURIComponent(mint)} />;
}
