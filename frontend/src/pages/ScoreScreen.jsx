import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

const RECOMMENDATION_STYLE = {
  genuine_understanding:            { color: 'text-green-400',  bg: 'bg-green-950 border-green-800',  label: 'Genuine understanding' },
  partial_understanding:            { color: 'text-yellow-400', bg: 'bg-yellow-950 border-yellow-800', label: 'Partial understanding' },
  ai_generated_does_not_understand: { color: 'text-red-400',    bg: 'bg-red-950 border-red-800',      label: 'AI-generated — does not understand' },
}

const VERDICT_COLOR = {
  demonstrated:     'text-green-400',
  partial:          'text-yellow-400',
  not_demonstrated: 'text-red-400',
}

export default function ScoreScreen() {
  const { token }           = useParams()
  const navigate            = useNavigate()
  const [report, setReport] = useState(null)
  const [displayScore, setDisplayScore] = useState(0)
  const [loading, setLoading]           = useState(true)
  const pollRef = useRef(null)

  useEffect(() => {
    function fetchReport() {
      axios.get(`${API}/api/reports/${token}`)
        .then(r => {
          if (r.status === 202) return // not ready yet
          setReport(r.data.report)
          setLoading(false)
          clearInterval(pollRef.current)
        })
        .catch(console.error)
    }

    fetchReport()
    pollRef.current = setInterval(fetchReport, 3000)
    return () => clearInterval(pollRef.current)
  }, [token])

  // Animate score count-up
  useEffect(() => {
    if (!report) return
    const target = report.overall_score
    let current  = 0
    const step   = Math.ceil(target / 60)
    const timer  = setInterval(() => {
      current = Math.min(current + step, target)
      setDisplayScore(current)
      if (current >= target) clearInterval(timer)
    }, 25)
    return () => clearInterval(timer)
  }, [report])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400">Generating your report...</p>
    </div>
  )

  const rec = RECOMMENDATION_STYLE[report.recommendation] || RECOMMENDATION_STYLE.partial_understanding

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-8 py-12">

        {/* Score */}
        <div className="text-center mb-10">
          <p className="text-gray-400 text-sm mb-2">Overall Score</p>
          <p className="text-8xl font-bold tabular-nums">{displayScore}</p>
          <p className="text-gray-600 text-lg">/100</p>
        </div>

        {/* Recommendation badge */}
        <div className={`border rounded-xl p-4 text-center mb-8 ${rec.bg}`}>
          <p className={`font-medium ${rec.color}`}>{rec.label}</p>
          {report.summary && (
            <p className="text-gray-400 text-sm mt-1">{report.summary}</p>
          )}
        </div>

        {/* Comprehension breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="font-medium mb-4">Comprehension Breakdown</h3>

          {report.understands?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-green-400 uppercase tracking-wide mb-2">Understands</p>
              <div className="flex flex-wrap gap-2">
                {report.understands.map((c, i) => (
                  <span key={i} className="bg-green-950 text-green-300 text-xs px-3 py-1 rounded-full border border-green-800">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.weak_in?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-yellow-400 uppercase tracking-wide mb-2">Weak in</p>
              <div className="flex flex-wrap gap-2">
                {report.weak_in.map((c, i) => (
                  <span key={i} className="bg-yellow-950 text-yellow-300 text-xs px-3 py-1 rounded-full border border-yellow-800">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.cannot_justify?.length > 0 && (
            <div>
              <p className="text-xs text-red-400 uppercase tracking-wide mb-2">Cannot justify</p>
              <div className="flex flex-wrap gap-2">
                {report.cannot_justify.map((c, i) => (
                  <span key={i} className="bg-red-950 text-red-300 text-xs px-3 py-1 rounded-full border border-red-800">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rubric verdicts */}
        {report.rubric_verdicts && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="font-medium mb-4">Rubric Verdicts</h3>
            <div className="flex flex-col gap-3">
              {Object.entries(report.rubric_verdicts).map(([criterion, verdict]) => (
                <div key={criterion} className="flex items-center justify-between">
                  <p className="text-sm text-gray-300">{criterion}</p>
                  <span className={`text-xs font-medium capitalize ${VERDICT_COLOR[verdict] || 'text-gray-400'}`}>
                    {verdict?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            to={`/tutor/${token}`}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-center rounded-lg py-3 font-medium transition"
          >
            Talk to AI Tutor
          </Link>
          <Link
            to="/dashboard"
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-center rounded-lg py-3 font-medium transition"
          >
            Back to Dashboard
          </Link>
        </div>

      </div>
    </div>
  )
}