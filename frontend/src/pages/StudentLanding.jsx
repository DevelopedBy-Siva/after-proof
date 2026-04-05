import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileCheck, Loader2, Upload, ArrowUpFromLine } from 'lucide-react'
import MarkdownPreview from '../components/MarkdownPreview'
import api from '../lib/api'

export default function StudentLanding() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [details, setDetails] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/api/submit/${token}`)
      .then((response) => setDetails(response.data))
      .catch(() => setError('Invalid or expired submission link'))
  }, [token])

  useEffect(() => {
    if (!details || details.status !== 'analyzing') {
      return undefined
    }

    const interval = setInterval(async () => {
      const response = await api.get(`/api/submit/${token}/status`)
      const status = response.data
      setDetails((current) => ({ ...current, ...status }))

      if (status.status === 'ready_for_defense' && status.sessionId) {
        clearInterval(interval)
        navigate(`/defense/${status.sessionId}`)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [details, token, navigate])

  async function handleUpload(event) {
    event.preventDefault()
    if (!file) return

    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post(`/api/submit/${token}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setDetails((current) => ({
        ...current,
        status: 'analyzing',
        submissionId: response.data.submissionId,
      }))
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (error && !details) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-red-500">
        {error}
      </div>
    )
  }

  if (!details) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-white px-6 text-neutral-500">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span>Loading activity...</span>
      </div>
    )
  }

  const analyzingSteps = [
    { label: 'Upload received', complete: true },
    { label: 'Reading your submission', complete: true },
    { label: 'Preparing concise questions', complete: true },
    { label: 'Opening your knowledge check', complete: false },
  ]

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>

            <p className="text-[1.65rem] font-medium tracking-tight text-blue-600">
              AfterProof
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 pb-12 pt-6">
        <section className="rounded-3xl border border-neutral-200 bg-white p-8">
          <h1 className="text-3xl font-medium tracking-tight text-neutral-900">
            {details.assignmentTitle}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-500">
            {details.description}
          </p>

          {details.additionalDetails ? 
          <div className="mt-6 max-w-3xl">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Additional Details
            </p>
            <MarkdownPreview
              content={details.additionalDetails}
              className="mt-3 text-sm leading-7 text-neutral-700"
            />
          </div>
          :""
          }

<div className="mt-6 space-y-4">
  <div>
    <p className="text-xs uppercase tracking-wide text-neutral-500">
      Due
    </p>
    <p className="mt-1 text-sm text-neutral-900">
      {new Date(details.deadline).toLocaleString()}
    </p>
  </div>

  <div>
    <p className="text-xs uppercase tracking-wide text-neutral-500">
      Student
    </p>
    <p className="mt-1 text-sm text-neutral-900">
      {details.studentName}
    </p>
  </div>
</div>
        </section>

        {details.status === 'pending' ? (
          <form
            onSubmit={handleUpload}
            className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8"
          >
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center transition hover:border-blue-300 hover:bg-blue-50/30">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>

              <span className="mt-4 text-base font-medium text-neutral-900">
                {file ? file.name : 'Upload your submission'}
              </span>

              <span className="mt-2 text-sm text-neutral-500">
                PDF or Word file
              </span>
            </label>

            {error ? (
              <p className="mt-4 text-sm text-red-500">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={!file || uploading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ArrowUpFromLine className="h-4 w-4" />
                  Submit activity
                </>
              )}
            </button>
          </form>
        ) : null}

{details.status === 'analyzing' ? (
  <div className="mt-10 flex flex-col items-center justify-center gap-4 text-center">
    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />

    <p className="text-sm text-neutral-600">
      Preparing your knowledge check session
    </p>
  </div>
) : null}
      </main>
    </div>
  )
}