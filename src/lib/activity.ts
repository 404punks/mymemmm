import { prisma } from "./db";

export async function recordActivity(input: {
  kind: string;
  title: string;
  summary: string;
  sourceKind: "onchain" | "ai" | "system";
  href?: string;
  signature?: string;
  address?: string;
  isDemo?: boolean;
}) {
  return prisma.activityEvent.create({ data: input });
}

export async function notify(input: { userId?: string; title: string; body: string; href?: string }) {
  return prisma.notification.create({ data: input });
}
