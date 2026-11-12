const CATEGORY_LABELS = {
  deal_inbound: 'Deal inbound',
  portfolio_update: 'Portfolio update',
  intro_request: 'Intro request',
  scheduling: 'Scheduling',
  spam: 'Spam',
  other: 'Other',
}

const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-200 text-slate-700',
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </div>
  )
}

export default function ResultCard({ result }) {
  const { category, priority, confidence, summary, rationale, tags, action_items } = result
  const confidencePct = Math.round(confidence * 100)

  return (
    <section className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-sm font-medium text-indigo-800">
          {CATEGORY_LABELS[category] ?? category}
        </span>
        <span className={`rounded-md px-2.5 py-1 text-sm font-medium capitalize ${PRIORITY_STYLES[priority]}`}>
          {priority} priority
        </span>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          <span>Confidence</span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-indigo-500" style={{ width: `${confidencePct}%` }} />
          </div>
          <span className="w-10 text-right tabular-nums">{confidencePct}%</span>
        </div>
      </div>

      <Section title="Summary">
        <p className="text-sm">{summary}</p>
      </Section>

      <Section title="Rationale">
        <p className="text-sm text-slate-700">{rationale}</p>
      </Section>

      <Section title="Action items">
        {action_items.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {action_items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No action needed.</p>
        )}
      </Section>

      {tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  tag === 'prompt_injection' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </Section>
      )}
    </section>
  )
}
