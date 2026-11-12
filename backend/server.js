require('dotenv').config({ quiet: true });
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { AnalyzeRequestSchema } = require('./schema');
const { analyzeEmail, AnalyzeError } = require('./analyzeService');

const app = express();
app.use(express.json({ limit: '100kb' }));

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute and try again.' },
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/analyze', analyzeLimiter, async (req, res) => {
  const input = AnalyzeRequestSchema.safeParse(req.body ?? {});
  if (!input.success) {
    return res.status(400).json({ error: input.error.issues[0].message });
  }

  try {
    const result = await analyzeEmail(input.data.text);
    res.json(result);
  } catch (err) {
    if (err instanceof AnalyzeError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message =
    err.type === 'entity.too.large' ? 'Request body is too large.'
    : err.type === 'entity.parse.failed' ? 'Request body must be valid JSON.'
    : 'Something went wrong.';
  res.status(status).json({ error: message });
});

if (require.main === module) {
  if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn('Warning: GROQ_API_KEY is not set. /api/analyze will fail until it is.');
  }
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
}

module.exports = app;
