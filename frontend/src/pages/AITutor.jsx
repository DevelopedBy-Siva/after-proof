import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileCheck, Bot, ArrowLeft, Loader2 } from 'lucide-react'
import MarkdownPreview from '../components/MarkdownPreview'
import api from '../lib/api'

export default function AITutor() {
  const { reportId } = useParams()
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [history, loading])

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
      setHistory((current) => [
        ...current,
        { role: 'model', parts: [{ text: response.data.reply }] },
      ])
    } finally {
      setLoading(false)
    }
  }

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

      <main className="mx-auto max-w-4xl px-8 pb-12 pt-4">
        <Link
          to={`/score/${reportId}?viewer=student`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="mt-6 max-w-2xl">
          <h1 className="text-3xl font-medium tracking-tight text-neutral-900">
            AI Tutor
          </h1>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Ask follow-up questions about your defense, understanding gaps, and
            where your responses may not have aligned with your submission.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-neutral-900">Conversation</p>
          </div>

          <div
            ref={messagesRef}
            className="mt-6 h-[420px] overflow-y-auto pr-2"
          >
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                  <p className="text-sm leading-6 text-neutral-600">
                    Ask where your understanding broke down, and the tutor will
                    respond using your defense context and behavioral signals.
                  </p>
                </div>
              ) : (
                history.map((entry, index) => (
                  <div
                    key={`${entry.role}-${index}`}
                    className={`flex ${
                      entry.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`inline-block max-w-[32rem] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        entry.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'border border-neutral-200 bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      {entry.role === 'model' ? (
                        <MarkdownPreview content={entry.parts[0].text} />
                      ) : (
                        entry.parts[0].text
                      )}
                    </div>
                  </div>
                ))
              )}

              {loading ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <form onSubmit={sendMessage} className="mt-6 flex gap-3">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What answer made it seem like I did not understand the submission?"
              className="flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-w-[96px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}