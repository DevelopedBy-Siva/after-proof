import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
    api.get(`/api/submit/${token}`)
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
    if (!file) {
      return
    }

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
    return <div className="min-h-screen bg-neutral-950 text-red-400 flex items-center justify-center px-6">{error}</div>
  }

  if (!details) {
    return <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center px-6">Loading assignment...</div>
  }

  const analyzingSteps = [
    { label: 'Upload received', complete: true },
    { label: 'Reading your submission', complete: true },
    { label: 'Preparing concise questions', complete: true },
    { label: 'Opening your live defense', complete: false },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_35%),linear-gradient(180deg,_#0a0a0a,_#171717)] text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-400">Submission Link</p>
        <h1 className="mt-3 text-4xl font-semibold">{details.assignmentTitle}</h1>
        <p className="mt-3 text-neutral-300">{details.description}</p>

        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6">
          <p className="text-sm text-neutral-400">Student</p>
          <p className="mt-1 text-lg font-medium">{details.studentName}</p>
          <div className="mt-5 rounded-2xl bg-neutral-950 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Additional Details</p>
            <MarkdownPreview content={details.additionalDetails || 'No additional details provided.'} className="mt-2 text-sm text-neutral-300" />
          </div>
          <p className="mt-4 text-sm text-neutral-400">Deadline: {new Date(details.deadline).toLocaleString()}</p>
        </div>

        {details.status === 'pending' ? (
          <form onSubmit={handleUpload} className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-700 px-6 py-10 text-center transition hover:border-amber-400">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <span className="text-lg font-medium">{file ? file.name : 'Drop in your submission'}</span>
              <span className="mt-2 text-sm text-neutral-500">PDF or Word file</span>
            </label>
            {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={!file || uploading}
              className="mt-5 w-full rounded-2xl bg-amber-400 px-4 py-3 font-medium text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
            >
              {uploading ? 'Uploading...' : 'Submit assignment'}
            </button>
          </form>
        ) : null}

        {details.status === 'analyzing' ? (
          <div className="mt-8 rounded-3xl border border-amber-900 bg-amber-950/30 p-6">
            <p className="text-lg font-medium text-amber-300">Preparing your defense session</p>
            <p className="mt-2 text-sm text-amber-100/70">
              Defendly is checking whether you understand the submission you turned in.
            </p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-neutral-950">
              <div className="h-full w-4/5 rounded-full bg-amber-400 transition-all duration-700" />
            </div>
            <div className="mt-5 space-y-2">
              {analyzingSteps.map((step) => (
                <div key={step.label} className="flex items-center gap-3 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${step.complete ? 'bg-amber-400' : 'bg-amber-100/30'}`} />
                  <span className={step.complete ? 'text-amber-100' : 'text-amber-100/60'}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
