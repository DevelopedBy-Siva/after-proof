import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../lib/api'

export default function AITutor() {
  const { reportId } = useParams()
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage(event) {
    event.preventDefault()
    if (!message.trim() || loading) {
      return
    }

    const outgoing = message
    const updatedHistory = [...history, { role: 'user', parts: [{ text: outgoing }] }]
    setHistory(updatedHistory)
    setMessage('')
    setLoading(true)

    try {
      const response = await api.post('/api/tutor/chat', {
        reportId,
        message: outgoing,
        history: updatedHistory,
      })
      setHistory((current) => [...current, { role: 'model', parts: [{ text: response.data.reply }] }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-400">AI Tutor</p>
            <h1 className="mt-2 text-3xl font-semibold">Review Your Defense</h1>
          </div>
          <Link to={`/score/${reportId}`} className="text-sm text-neutral-400 transition hover:text-white">
            Back to score
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="space-y-4">
            {history.length === 0 ? (
              <p className="text-neutral-400">
                Ask where your understanding broke down, and the tutor will answer using your actual defense report.
              </p>
            ) : history.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  entry.role === 'user' ? 'ml-auto bg-amber-400 text-neutral-950' : 'bg-neutral-950 text-neutral-200'
                }`}
              >
                {entry.parts[0].text}
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="mt-6 flex gap-3">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What did I get wrong on the learning rate question?"
              className="flex-1 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-amber-400 px-5 py-3 font-medium text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
            >
              {loading ? 'Thinking...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
