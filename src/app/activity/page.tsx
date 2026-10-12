import { ActivityFeed } from "@/components/activity-feed";

export const metadata = { title: "Live activity" };

export default function ActivityPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl">Live activity</h1>
        <p className="mt-1 max-w-2xl text-sm text-paper-dim">Database events from confirmed launches, assistant publications, model jobs, and index runs. On-chain rows and AI rows are badged separately. Sample events are marked.</p>
      </header>
      <ActivityFeed />
    </div>
  );
}
