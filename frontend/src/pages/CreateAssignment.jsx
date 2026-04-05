import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, FileCheck } from 'lucide-react'
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
        referenceDocUrls: form.referenceDocUrls
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean),
      })
      navigate('/dashboard')
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to create assignment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          
          <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>

            <p className="text-[1.65rem] font-medium tracking-tight text-blue-600">
            AfterProof
            </p>
          </div>

        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-8 py-10">
        
        {/* Back link */}
        <Link
  to="/dashboard"
  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50"
>
  ←
</Link>

        <div className="mb-6 grid gap-2 lg:grid-cols-[1.1fr,0.9fr]">
        
  
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-8 my-5"
          >
                    <h1 className="text-2xl font-medium tracking-tight mb-8 text-neutral-900">
    Create New Activity
  </h1>
            <div className="space-y-2">
              <input
                required
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="Activity title"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Activity description"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-2">
              <textarea
                rows={8}
                value={form.additionalDetails}
                onChange={(event) => update('additionalDetails', event.target.value)}
                placeholder="Additional details (Optional)"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={form.difficulty}
                onChange={(event) => update('difficulty', event.target.value)}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error ? (
              <p className="text-sm font-medium text-red-500">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-300"            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating activity...
                </>
              ) : (
                'Create activity'
              )}
            </button>
          </form>

          {/* Preview */}
          <section className="rounded-3xl border border-neutral-200 bg-white my-5 p-8">
            <p className="text-sm font-medium text-blue-600">Preview</p>

            <h2 className="mt-4 text-2xl font-medium tracking-tight text-neutral-900">
              {form.title || 'Activity title'}
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-500">
              {form.description || 'Activity description preview'}
            </p>

            <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-neutral-500">
              <MarkdownPreview
                content={
                  form.additionalDetails ||
                  'Additional details will render here as Markdown.'
                }
              />
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}