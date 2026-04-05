import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MarkdownPreview from '../components/MarkdownPreview'
import api from '../lib/api'

export default function CreateAssignment() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    additionalDetails: '',
    difficulty: 'medium',
    deadline: '',
    referenceDocUrls: '',
  })

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await api.post('/api/assignments', {
        title: form.title,
        description: form.description,
        additionalDetails: form.additionalDetails,
        difficulty: form.difficulty,
        deadline: new Date(form.deadline).toISOString(),
        referenceDocUrls: form.referenceDocUrls.split('\n').map((value) => value.trim()).filter(Boolean),
      })
      navigate('/dashboard')
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to create assignment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/dashboard" className="text-sm text-neutral-400 transition hover:text-white">
          Back to dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Create Assignment</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-8">
            <input
              required
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Assignment title"
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-amber-400"
            />
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Assignment description"
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-amber-400"
            />
            <textarea
              rows={8}
              value={form.additionalDetails}
              onChange={(event) => update('additionalDetails', event.target.value)}
              placeholder="Additional details for the defense context. Markdown supported."
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-amber-400"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={form.difficulty}
                onChange={(event) => update('difficulty', event.target.value)}
                className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-amber-400"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <input
                required
                type="datetime-local"
                value={form.deadline}
                onChange={(event) => update('deadline', event.target.value)}
                className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-amber-400"
              />
            </div>
            <textarea
              rows={3}
              value={form.referenceDocUrls}
              onChange={(event) => update('referenceDocUrls', event.target.value)}
              placeholder="Optional reference doc URLs, one per line"
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-amber-400"
            />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-medium text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
            >
              {loading ? 'Creating assignment...' : 'Create assignment'}
            </button>
          </form>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-400">Markdown Preview</p>
            <h2 className="mt-4 text-2xl font-semibold">{form.title || 'Assignment title'}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-300">{form.description || 'Assignment description preview'}</p>
            <div className="mt-6 rounded-2xl bg-neutral-950 p-5">
              <MarkdownPreview content={form.additionalDetails || 'Additional details will render here as Markdown.'} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
