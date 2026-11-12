import { useState } from 'react'
import ResultCard from './components/ResultCard.jsx'
import { SAMPLES } from './samples.js'

const MAX_CHARS = 10000
const REQUEST_TIMEOUT_MS = 20000

function getErrorMessage(err) {
  if (err.name === 'TimeoutError') return 'The request timed out. Please try again.'
  if (err instanceof TypeError) return 'Could not reach the server. Is the backend running?'
  return err.message
}

export default function App() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const tooLong = text.length > MAX_CHARS
  const canSubmit = text.trim().length > 0 && !tooLong && !loading

  function loadSample(sampleText) {
    setText(sampleText)
    setResult(null)
    setError('')
  }

  async function handleAnalyze() {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setResult(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">VC Email Triage</h1>
          <p className="mt-1 text-sm text-slate-600">
            Paste an inbound email to get a category, priority, summary and next steps.
          </p>
        </header>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Try a sample:</span>
          {SAMPLES.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => loadSample(sample.text)}
              disabled={loading}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              {sample.label}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the raw email here…"
          rows={12}
          className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />

        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs ${tooLong ? 'text-red-600' : 'text-slate-500'}`}>
            {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
          </span>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && <ResultCard result={result} />}
      </main>
    </div>
  )
}
