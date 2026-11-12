# VC Email Triage

A small tool that takes a raw inbound email and returns a structured triage result for a venture capital team: category, priority, confidence, summary, rationale, tags and action items.

```
vc-email-triage/
├── backend/                 Express API (Node, CommonJS)
│   ├── server.js            App, routes, rate limiting, error handling
│   ├── analyzeService.js    Prompt, OpenAI call, timeout + output validation
│   ├── schema.js            Zod schemas + JSON Schema for structured output
│   └── tests/analyze.test.js
└── frontend/                React + Vite + Tailwind
    └── src/
        ├── App.jsx
        ├── components/ResultCard.jsx
        └── samples.js       Quick-fill sample emails
```

## Setup

Requirements: Node 18+ and an OpenAI API key.

### Backend

```bash
cd backend
npm install
cp .env.example .env        # then set GROQ_API_KEY
npm run dev                 # http://localhost:3001
npm test                    # runs the mocked Jest suite, no API key needed
```

Environment variables:

| Variable         | Default               | Notes                               |
| ---------------- | -------------         | -----------------------------       |
| `GROQ_API_KEY`   | (required)            | Free tier key from console.groq.com |
| `GROQ_MODEL`     | `openai/gpt-oss-120b` | Any Groq model supporting JSON mode |
| `PORT`           | `3001`                |                                     |

### Frontend
`
In a second terminal:

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:3001`, so there is no CORS setup.

## API

`POST /api/analyze`

```json
{ "text": "raw email text" }
```

Success (`200`):

```json
{
  "category": "deal_inbound",
  "tags": ["seed", "fintech"],
  "priority": "high",
  "confidence": 0.91,
  "summary": "Ledgerly is raising a $2M seed for AI bookkeeping.",
  "rationale": "Direct fundraising pitch with strong traction.",
  "action_items": ["Review the deck", "Reply with availability"]
}
```

Errors always come back as `{ "error": "message" }`:

| Status | When |
| ------ | ---- |
| 400 | Empty text, non-string text, over 10,000 characters, or invalid JSON |
| 413 | Request body over 100 KB |
| 429 | More than 20 requests per minute from one IP |
| 502 | Provider error, model refusal, or model output that fails Zod validation |
| 503 | Provider rate limit hit |
| 504 | Provider did not answer within 15 seconds |

## Decisions and tradeoffs

- **Plain JavaScript + Express.** With a 4-hour budget I picked the stack with the least setup and the fewest ways to fail: no TypeScript build step, no framework conventions to fight. Zod gives the runtime guarantees that matter here (the LLM output), which is where types would have helped most anyway.
- **CommonJS on the backend.** Jest's ESM support still needs experimental flags. CommonJS keeps `npm test` a one-liner.
- **Stateless.** No database. Each request is independent, which also makes horizontal scaling trivial.
- **Two layers of output checking.** JSON Mode + Zod Validation. The LLM is instructed via the system prompt to return JSON matching a specific schema, enforced by the SDK's json_object mode. However, LLMs can hallucinate keys. Zod acts as the absolute runtime gatekeeper—stripping unknown keys, enforcing enums (like priority/category), and ensuring confidence is a float between 0 and 1 before anything reaches the client.
- **Prompt injection defence is framing, not a guarantee.** The system prompt marks the email as untrusted data, the email is wrapped in `<email>` tags, and any `<email>`/`</email>` inside the body is stripped so it can't close the block early. The model is asked to tag attempts as `prompt_injection`. This lowers the risk a lot but no prompt makes an LLM fully injection-proof; the real safety net is that the output can only ever be one of the allowed values, and nothing downstream acts on it automatically.
- **Timeouts.** The SDK timeout is 15s with retries disabled, so the user waits at most ~15s. The frontend has its own 20s timeout in case the server itself hangs.
- **No retries.** A retry on 5xx would be nice, but it doubles worst-case latency. For an interactive tool I preferred a fast, clear error.
- **Confidence is self-reported** by the model. It is useful as a rough signal in the UI, not as a calibrated probability.
- **Email content is not logged.** Server logs record error types and validation issues only.
- **Rate limiting is in memory**, per IP. Fine for one instance; behind a proxy you would add `app.set('trust proxy', 1)`, and with several instances you would move the store to Redis.

## What I would improve with more time
- **Better LLM Context:** Provide the model with a few-shot prompt (examples of valid vs. invalid emails) to improve categorization edge cases.
- **Authentication & Security:** Add API key authentication for the backend endpoint and implement stricter CORS policies instead of allowing all origins.
- **Testing:** Add Cypress or Playwright for end-to-end frontend testing, ensuring the UI states (loading, error banners, result parsing) work reliably under real browser conditions.

## Tests

Running `npm test` inside `backend/` runs 3 Jest + Supertest cases with `chat.completions.create` mocked out:

- **Valid output**: Checks that a valid LLM response passes Zod validation and returns `200`.

- **Invalid output / Timeout**: Verifies that bad model categories/confidence scores return `502` instead of leaking to the client, and timeouts return `504`.

- **Prompt injection framing**: Verifies that adversarial instructions and fake `</email>` tags stay sanitized inside a single `<email>` user block while the system prompt enforces the untrusted-data rules.

## How I used AI

I built the core Express backend and React flow around the assignment specs, and used Claude mainly to speed up the areas where I'm less practiced:

- **Tailwind CSS & UI Layout**: I used AI to generate the Tailwind utility classes for App.jsx and ResultCard.jsx (like the confidence progress bar, badge colors, and responsive spacing) so I didn't spend too much of the 4-hour window tweaking CSS by hand.

- **Zod Schema & Jest Mocking**: I wasn't fully hands-on with Zod's chaining syntax or mocking OpenAI SDK prototypes in Jest (jest.spyOn), so I used AI to help write schema.js and the test setup in analyze.test.js. I also used it to draft the sample emails in samples.js.

From there, I wired up the Groq API configuration, adjusted the system prompt rules to handle delimiter stripping properly, and tested the edge cases locally to make sure the validation actually caught bad responses.

## Scaling note

At 10,000 users the API servers are not the bottleneck; they are stateless and scale horizontally. The limit is the LLM provider: tokens-per-minute and requests-per-minute quotas, plus 2–10s latency per call, which ties up concurrent connections.

I would move analysis off the request path. `POST /api/analyze` validates input, pushes a job to a BullMQ queue on Redis and returns a job ID. Workers pull jobs with a concurrency limit and rate limiter matched to the provider quota, retry with backoff on 429/5xx, and store results in Redis with a TTL. Clients poll `GET /api/jobs/:id` or receive a webhook on completion. Bursts then become queue depth instead of failed requests, and the in-memory rate limiter moves to Redis so it works across instances. Caching results by content hash avoids paying twice for duplicate emails.

For per-tenant customization, each request carries an org ID. Before calling the model, the worker loads that org's config (cached): prompt template, custom category list, priority rules and model ID. The Zod and JSON schemas are built from that config at runtime instead of being hardcoded, so each fund gets its own taxonomy without code changes.
