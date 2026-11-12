const { z } = require('zod');

const CATEGORIES = ['deal_inbound', 'portfolio_update', 'intro_request', 'scheduling', 'spam', 'other'];
const PRIORITIES = ['low', 'medium', 'high'];
const MAX_EMAIL_CHARS = 10_000;

const AnalyzeRequestSchema = z.object({
  text: z
    .string({ error: 'text must be a string' })
    .trim()
    .min(1, 'Email text is required')
    .max(MAX_EMAIL_CHARS, `Email text must be at most ${MAX_EMAIL_CHARS} characters`),
});

const AnalysisSchema = z.object({
  category: z.enum(CATEGORIES),
  tags: z.array(z.string()),
  priority: z.enum(PRIORITIES),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  rationale: z.string().min(1),
  action_items: z.array(z.string()),
});

const analysisJsonSchema = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: CATEGORIES },
    tags: { type: 'array', items: { type: 'string' } },
    priority: { type: 'string', enum: PRIORITIES },
    confidence: { type: 'number', description: 'Between 0 and 1' },
    summary: { type: 'string', description: '1-2 sentences' },
    rationale: { type: 'string' },
    action_items: { type: 'array', items: { type: 'string' } },
  },
  required: ['category', 'tags', 'priority', 'confidence', 'summary', 'rationale', 'action_items'],
  additionalProperties: false,
};

module.exports = {
  CATEGORIES,
  PRIORITIES,
  MAX_EMAIL_CHARS,
  AnalyzeRequestSchema,
  AnalysisSchema,
  analysisJsonSchema,
};
