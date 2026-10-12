import { AgentWizard } from "@/components/agent-wizard";

export const metadata = { title: "Create agent" };

export default function NewAgentPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Create an assistant</h1>
      <p className="max-w-2xl text-sm text-paper-dim">Four steps. Publishing requires a wallet signature session. The profile is a user-operated assistant, not an autonomous agent.</p>
      <AgentWizard />
    </div>
  );
}
