import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../lib/api'

const REC_COLORS = {
  'Clearly authored': 'bg-emerald-950 text-emerald-300 border-emerald-800',
  'Possibly AI-assisted but understands': 'bg-amber-950 text-amber-300 border-amber-800',
  'AI-generated, does not understand': 'bg-red-950 text-red-300 border-red-800',
}

export default function ScoreScreen() {
  const { reportId } = useParams()
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

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-400">Comprehension Report</p>
        <h1 className="mt-3 text-3xl font-semibold">{report.studentName}</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[18rem,1fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <p className="text-sm text-neutral-400">Overall score</p>
            <p className="mt-4 text-7xl font-semibold tabular-nums">{displayScore}</p>
            <p className="text-neutral-500">/100</p>
          </div>

          <div className={`rounded-3xl border p-6 ${REC_COLORS[report.recommendation] || 'bg-neutral-900 border-neutral-800 text-white'}`}>
            <p className="text-sm uppercase tracking-[0.25em]">Recommendation</p>
            <p className="mt-3 text-2xl font-semibold">{report.recommendation}</p>
            <p className="mt-3 text-sm text-neutral-200">{report.summary}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ScoreColumn title="Understands" items={report.understands} tone="emerald" />
          <ScoreColumn title="Weak In" items={report.weakIn} tone="amber" />
          <ScoreColumn title="Cannot Justify" items={report.cannotJustify} tone="red" />
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">Rubric Alignment</h2>
          <div className="mt-5 space-y-4">
            {report.rubricAlignment?.map((item, index) => (
              <div key={`${item.criterion}-${index}`} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{item.criterion}</p>
                  <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-neutral-300">
                    {item.verdict}
                  </span>
                </div>
                <p className="mt-2 text-sm text-neutral-400">{item.evidence}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <Link to={`/tutor/${reportId}`} className="rounded-2xl bg-amber-400 px-5 py-3 font-medium text-neutral-950 transition hover:bg-amber-300">
            Talk to AI tutor
          </Link>
          <Link to="/dashboard" className="rounded-2xl border border-neutral-700 px-5 py-3 text-neutral-300 transition hover:border-neutral-500 hover:text-white">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

function ScoreColumn({ title, items = [], tone }) {
  const tones = {
    emerald: 'border-emerald-900 bg-emerald-950/20 text-emerald-200',
    amber: 'border-amber-900 bg-amber-950/20 text-amber-200',
    red: 'border-red-900 bg-red-950/20 text-red-200',
  }

  return (
    <section className={`rounded-3xl border p-6 ${tones[tone]}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item, index) => (
          <p key={`${title}-${index}`} className="rounded-2xl border border-current/10 bg-black/10 p-3 text-sm">
            {item}
          </p>
        )) : <p className="text-sm opacity-70">No items recorded.</p>}
      </div>
    </section>
  )
}
