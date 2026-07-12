"use client";

import { useState } from "react";

const MAX_LENGTH = 5000;

type GenerateResponse = {
  success: boolean;
  data: { openers: string[] } | null;
  error: string | null;
};

export default function Home() {
  const [jobPost, setJobPost] = useState("");
  const [openers, setOpeners] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const isNearCap = jobPost.length > MAX_LENGTH * 0.9;
  const canGenerate = jobPost.trim().length > 0 && !isLoading;

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    setOpeners(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPost }),
      });
      const body: GenerateResponse = await res.json();
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? "Something went wrong. Try again.");
        return;
      }
      setOpeners(body.data.openers);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <header className="mb-10">
        <p className="text-sm font-medium text-emerald-400 mb-2">
          Freelancer tool
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-50">
          Proposal Opener Generator
        </h1>
        <p className="mt-3 text-zinc-400 leading-relaxed max-w-[55ch]">
          Paste a job post below. Get three opening lines that reference what
          the client actually wrote, instead of boilerplate.
        </p>
      </header>

      <section aria-label="Job post input">
        <label
          htmlFor="job-post"
          className="block text-sm font-medium text-zinc-300 mb-2"
        >
          Job post
        </label>
        <textarea
          id="job-post"
          value={jobPost}
          onChange={(e) => setJobPost(e.target.value)}
          maxLength={MAX_LENGTH}
          disabled={isLoading}
          rows={9}
          placeholder="Paste the full job post here..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-60 resize-y"
        />
        <div className="mt-2 flex items-center justify-between gap-4">
          <span
            className={`text-xs tabular-nums ${
              isNearCap ? "text-amber-400" : "text-zinc-500"
            }`}
          >
            {jobPost.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading ? "Generating..." : "Generate openers"}
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {isLoading && (
        <div className="mt-8 space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="h-3 w-3/4 rounded bg-zinc-800 mb-2.5" />
              <div className="h-3 w-1/2 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      )}

      {openers && (
        <section aria-label="Generated openers" className="mt-8">
          <h2 className="text-sm font-medium text-zinc-300 mb-3">
            Your openers
          </h2>
          <ol className="space-y-3">
            {openers.map((opener, index) => (
              <li
                key={index}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <p className="text-sm leading-relaxed text-zinc-200">
                  {opener}
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopy(opener, index)}
                    className="rounded-md border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-emerald-500/50 hover:text-emerald-300 active:scale-[0.98]"
                  >
                    {copiedIndex === index ? "Copied" : "Copy"}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className="mt-16 border-t border-zinc-900 pt-6 text-xs text-zinc-500">
        Stateless: nothing you paste is stored. Limited to 5 requests per
        minute.
      </footer>
    </main>
  );
}
