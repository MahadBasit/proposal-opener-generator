import { NextRequest, NextResponse } from "next/server";
import { ipAddress } from "@vercel/functions";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateOpeners } from "@/lib/gemini";

const MAX_JOB_POST_LENGTH = 5_000;

function errorResponse(status: number, message: string, headers?: HeadersInit) {
  return NextResponse.json(
    { success: false, data: null, error: message },
    { status, headers },
  );
}

export async function POST(request: NextRequest) {
  // ipAddress() is undefined outside Vercel (local dev) — bucket those together.
  const ip = ipAddress(request) ?? "local";
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return errorResponse(429, "Too many requests. Try again in a minute.", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Job post text is required.");
  }

  const jobPost = (body as { jobPost?: unknown })?.jobPost;
  if (typeof jobPost !== "string" || jobPost.trim().length === 0) {
    return errorResponse(400, "Job post text is required.");
  }
  if (jobPost.length > MAX_JOB_POST_LENGTH) {
    return errorResponse(400, "Job post too long (max 5,000 characters).");
  }

  const result = await generateOpeners(jobPost.trim());
  if (!result.ok) {
    if (result.kind === "timeout") {
      return errorResponse(504, "Generation timed out. Try again.");
    }
    return errorResponse(502, "Generation failed. Try again.");
  }

  return NextResponse.json({
    success: true,
    data: { openers: result.openers },
    error: null,
  });
}
