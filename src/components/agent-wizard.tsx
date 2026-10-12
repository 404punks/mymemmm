"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, SKILLS, SKILL_LABELS } from "@/lib/constants";

type Model = { provider: string; model: string; label: string; configured: boolean };

const EMPTY = {
  name: "",
  handle: "",
  description: "",
  category: "research",
  personality: "Precise, cautious, source-first",
  skills: ["research"] as string[],
  providerId: "",
  modelId: "",
  systemPrompt: "You help the user research public AI systems and token metadata. You never promise returns.",
  dailyLimit: 40,
  publish: false,
};

export function AgentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [models, setModels] = useState<Model[]>([]);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("np-agent-draft");
    if (saved) {
      try { setForm({ ...EMPTY, ...JSON.parse(saved) }); } catch { /* ignore broken drafts */ }
    }
    void fetch("/api/ai/models").then((res) => res.json()).then((data) => setModels(data.models ?? []));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("np-agent-draft", JSON.stringify(form));
  }, [form]);

  function toggleSkill(skill: string) {
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(skill) ? current.skills.filter((item) => item !== skill) : [...current.skills, skill],
    }));
  }

  async function previewModel() {
    setPreview("");
    const configured = models.find((model) => model.provider === form.providerId && model.model === form.modelId && model.configured);
    if (!configured) {
      setPreview("No configured model is selected, so this assistant will stay paused and will not call a provider.");
      return;
    }
    setPreview(`Selected ${configured.label}. A live preview runs after the profile is published, using the system instructions on this form.`);
  }

  async function save(publish: boolean) {
    setPending(true);
    setError("");
    const response = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, publish, providerId: form.providerId || null, modelId: form.modelId || null }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not save the profile");
      return;
    }
    window.localStorage.removeItem("np-agent-draft");
    router.push(`/agents/${data.handle}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
      <ol className="space-y-2 text-sm">
        {["Identity", "Purpose", "Model", "Review"].map((label, index) => (
          <li key={label}><button className="nav-link w-full" data-active={step === index} onClick={() => setStep(index)}>{index + 1}. {label}</button></li>
        ))}
      </ol>
      <form className="panel space-y-4 p-4" onSubmit={(event) => event.preventDefault()}>
        {step === 0 ? (
          <>
            <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <Field label="Username" value={form.handle} onChange={(handle) => setForm({ ...form, handle: handle.toLowerCase() })} hint="Lowercase letters, numbers, hyphens." />
            <label className="block text-sm">Description<textarea className="area mt-1" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label className="block text-sm">Category
              <select className="select mt-1" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <Field label="Personality" value={form.personality} onChange={(personality) => setForm({ ...form, personality })} />
            <img alt="Avatar preview" src={`/avatar/${form.handle || "draft"}`} className="h-16 w-16 rounded-2xl" />
          </>
        ) : null}
        {step === 1 ? (
          <fieldset>
            <legend className="text-sm">Skills</legend>
            <div className="mt-2 grid gap-2">
              {SKILLS.map((skill) => (
                <label key={skill} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.skills.includes(skill)} onChange={() => toggleSkill(skill)} />
                  {SKILL_LABELS[skill]}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {step === 2 ? (
          <>
            <label className="block text-sm">Allowlisted model
              <select className="select mt-1" value={`${form.providerId}:${form.modelId}`} onChange={(event) => {
                const [providerId, modelId] = event.target.value.split(":");
                setForm({ ...form, providerId: providerId || "", modelId: modelId || "" });
              }}>
                <option value=":">Unconfigured — assistant stays paused</option>
                {models.map((model) => (
                  <option key={model.label} value={`${model.provider}:${model.model}`} disabled={!model.configured}>
                    {model.label} {model.configured ? "" : "(key missing)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">System instructions
              <textarea className="area mt-1" value={form.systemPrompt} onChange={(event) => setForm({ ...form, systemPrompt: event.target.value })} />
            </label>
            <label className="block text-sm">Daily usage limit
              <input className="field mt-1" type="number" min={1} max={500} value={form.dailyLimit} onChange={(event) => setForm({ ...form, dailyLimit: Number(event.target.value) })} />
            </label>
            <button className="btn btn-ghost" type="button" onClick={() => void previewModel()}>Check model status</button>
            {preview ? <p className="text-sm text-paper-dim">{preview}</p> : null}
          </>
        ) : null}
        {step === 3 ? (
          <div className="space-y-2 text-sm">
            <p><b>{form.name || "Unnamed"}</b> @{form.handle || "handle"}</p>
            <p className="text-paper-dim">{form.description}</p>
            <p>Skills: {form.skills.join(", ") || "none"}</p>
            <p>Model: {form.modelId ? `${form.providerId}/${form.modelId}` : "paused until a model is configured"}</p>
            <p>Limit: {form.dailyLimit}/day · user-operated assistant</p>
            {error ? <p className="text-danger">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-ghost" disabled={pending} onClick={() => void save(false)}>Save profile</button>
              <button className="btn btn-primary" disabled={pending} onClick={() => void save(true)}>Publish</button>
            </div>
            <p className="text-xs text-paper-faint">Publishing and saving both require a signed-in wallet. The signature is not a transaction approval.</p>
          </div>
        ) : null}
        <div className="flex justify-between">
          <button className="btn btn-quiet" type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>Back</button>
          {step < 3 ? <button className="btn btn-ghost" type="button" onClick={() => setStep((value) => value + 1)}>Continue</button> : null}
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return (
    <label className="block text-sm">
      {label}
      <input className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? <span className="mt-1 block text-xs text-paper-faint">{hint}</span> : null}
    </label>
  );
}
