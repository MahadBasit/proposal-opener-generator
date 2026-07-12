const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";
const TIMEOUT_MS = 30_000;
const MIN_OPENERS = 2;
const MAX_OPENERS = 3;

export type GenerateResult =
  | { ok: true; openers: string[] }
  | { ok: false; kind: "timeout" | "upstream" };

function buildPrompt(jobPost: string): string {
  return `You are helping a freelance developer write Upwork proposal openers.

Below is a job post a client published. Write exactly 3 short opening lines
for a proposal responding to it.

Rules:
- Each opener is 1-2 sentences, maximum 40 words.
- Each must reference at least one concrete specific from the job post: the
  stated problem, the tech stack, the business domain, or a detail most
  bidders would skim past.
- No generic filler: no "I'm excited", "I'm a passionate developer",
  "Dear client", "I read your job post with great interest".
- Do not invent experience, credentials, or portfolio items.
- Vary the angle across the 3 openers:
  1. Lead with the client's problem restated in sharper terms.
  2. Lead with a specific observation or clarifying insight about their post.
  3. Lead with the concrete first step you would take on the work.
- Respond with ONLY valid JSON, no markdown fences, in this exact shape:
  {"openers": ["...", "...", "..."]}

JOB POST:
<<<
${jobPost}
>>>`;
}

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
};

function extractText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("");
}

function parseOpeners(text: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const openers = (parsed as { openers?: unknown })?.openers;
  if (!Array.isArray(openers)) {
    return null;
  }

  const valid = openers
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  // Model is asked for exactly 3; 2 is an accepted fallback since LLMs
  // occasionally under-deliver on exact counts. Fewer than 2 is a failure.
  if (valid.length < MIN_OPENERS) {
    return null;
  }
  return valid.slice(0, MAX_OPENERS);
}

export async function generateOpeners(jobPost: string): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return { ok: false, kind: "upstream" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(jobPost) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Gemini request failed with status ${response.status}`);
      return { ok: false, kind: "upstream" };
    }

    const data = (await response.json()) as GeminiResponse;
    const openers = parseOpeners(extractText(data));
    if (!openers) {
      console.error("Gemini response did not contain valid openers JSON");
      return { ok: false, kind: "upstream" };
    }
    return { ok: true, openers };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, kind: "timeout" };
    }
    console.error("Gemini request failed", error);
    return { ok: false, kind: "upstream" };
  } finally {
    clearTimeout(timer);
  }
}
