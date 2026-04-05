import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import MarkdownPreview from '../components/MarkdownPreview'
import api from '../lib/api'

const REC_COLORS = {
  'Clearly understands submission': 'bg-emerald-950 text-emerald-300 border-emerald-800',
  'Partial understanding': 'bg-amber-950 text-amber-300 border-amber-800',
  'Does not appear to understand submission': 'bg-red-950 text-red-300 border-red-800',
}

export default function ScoreScreen() {
  const { reportId } = useParams()
  const location = useLocation()
  const viewer = new URLSearchParams(location.search).get('viewer') || 'student'
  const [report, setReport] = useState(null)
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    api.get(`/api/report/${reportId}`).then((response) => setReport(response.data))
  }, [reportId])

  useEffect(() => {
    if (!report) {
      return undefined
    }

    let frame = 0
    const target = report.overallScore
    const timer = window.setInterval(() => {
      frame += 1
      setDisplayScore(Math.min(target, Math.round((target * frame) / 45)))
      if (frame >= 45) {
        window.clearInterval(timer)
      }
    }, 33)

    return () => window.clearInterval(timer)
  }, [report])

  if (!report) {
    return <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center">Loading report...</div>
  }

  const summaryMarkdown = viewer === 'prof' ? report.professorSummaryMarkdown : report.studentSummaryMarkdown

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-400">
          {viewer === 'prof' ? 'Professor Report' : 'Student Report'}
        </p>
        <h1 className="mt-3 text-3xl font-semibold">{report.studentName}</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[18rem,1fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <p className="text-sm text-neutral-400">Final score</p>
            <p className="mt-4 text-7xl font-semibold tabular-nums">{displayScore}</p>
            <p className="text-neutral-500">/100</p>
          </div>

          <div className={`rounded-3xl border p-6 ${REC_COLORS[report.recommendation] || 'bg-neutral-900 border-neutral-800 text-white'}`}>
            <p className="text-sm uppercase tracking-[0.25em]">AI Conclusion</p>
            <p className="mt-3 text-2xl font-semibold">{report.aiConclusion}</p>
            <MarkdownPreview content={summaryMarkdown} className="mt-4 text-sm text-neutral-100" />
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">Defense Review</h2>
          <div className="mt-5 space-y-5">
            {report.qaReview?.map((item, index) => (
              <div key={`${item.question_text}-${index}`} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Question {index + 1}</p>
                <p className="mt-2 font-medium text-neutral-100">{item.question_text}</p>

                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-neutral-500">Student Answer</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">{item.answer_text}</p>

                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
                  {viewer === 'prof' ? 'Why it does not align with the submission' : 'Why this was marked this way'}
                </p>
                <MarkdownPreview
                  content={viewer === 'prof' ? item.submission_alignment_markdown : item.why_marked_wrong_markdown}
                  className="mt-2 text-sm text-neutral-200"
                />

                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-neutral-500">Behavioral Signals</p>
                <MarkdownPreview content={item.behavioral_signal_markdown} className="mt-2 text-sm text-neutral-300" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">Understanding Gaps</h2>
          <div className="mt-4 space-y-3">
            {(report.understandingGaps || []).map((gap, index) => (
              <p key={`${gap}-${index}`} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-200">
                {gap}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">Behavior Summary</h2>
          <MarkdownPreview content={report.behavioralSummaryMarkdown} className="mt-4 text-sm text-neutral-200" />
        </div>

        <div className="mt-8 flex gap-4">
          {viewer !== 'prof' ? (
            <Link to={`/tutor/${reportId}`} className="rounded-2xl bg-amber-400 px-5 py-3 font-medium text-neutral-950 transition hover:bg-amber-300">
              Ask Tutor
            </Link>
          ) : null}
          <Link to="/dashboard" className="rounded-2xl border border-neutral-700 px-5 py-3 text-neutral-300 transition hover:border-neutral-500 hover:text-white">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
