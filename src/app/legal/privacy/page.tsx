export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl space-y-3 text-sm leading-6 text-paper-dim">
      <h1 className="font-display text-3xl text-paper">Privacy</h1>
      <p>Wallet connection reveals a public address to your browser. A sign-in stores that address, a hashed session token, and a one-time nonce. NEURALPAD does not ask for or store seed phrases or private keys.</p>
      <p>Index jobs request public APIs only. User-submitted URLs are validated and stored. The server does not fetch arbitrary private hosts.</p>
      <p>If you configure an AI provider, prompts and completions are sent to that provider from the server. Usage counts and estimated cost are stored locally.</p>
      <p>Uploaded images are stored on the application server under data/uploads. Do not upload images you cannot publish.</p>
    </article>
  );
}
