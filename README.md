# Proposal Opener Generator

Paste an Upwork job post, get 2-3 short proposal opening lines that reference specifics from the post. Built with Next.js 16 (App Router) + Gemini, deployed on Vercel.

Stateless: one request in, one response out. No accounts, no storage.

## Stack

- Next.js 16, App Router, TypeScript, Tailwind v4
- Gemini (`gemini-3.5-flash`) called server-side via a single route handler
- Per-IP rate limit (5 req/min) and 5,000-char input cap on the public API route

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY
npm run dev
```

Required env var:

| Name | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (server-side only, never exposed to the client) |

## Deploy

Import the repo in the Vercel dashboard and set `GEMINI_API_KEY` in the project's environment variables. No other configuration needed.

## API

`POST /api/generate` with `{ "jobPost": "..." }` returns:

```json
{ "success": true, "data": { "openers": ["...", "...", "..."] }, "error": null }
```

Errors return `{ "success": false, "data": null, "error": "<message>" }` with 400 (validation), 429 (rate limit), 502/504 (upstream failure/timeout).
