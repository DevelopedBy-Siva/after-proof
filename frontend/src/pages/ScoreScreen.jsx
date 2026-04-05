import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { FileCheck, Bot, User, ChevronDown } from 'lucide-react'
import MarkdownPreview from '../components/MarkdownPreview'
import api from '../lib/api'

export default function ScoreScreen() {
  const { reportId } = useParams()
  const location = useLocation()
  const viewer = new URLSearchParams(location.search).get('viewer') || 'student'

  const [report, setReport] = useState(null)
  const [openItems, setOpenItems] = useState({ 0: true })

  useEffect(() => {
    api.get(`/api/report/${reportId}`).then((response) => setReport(response.data))
  }, [reportId])

  const toggleItem = (index) => {
    setOpenItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-neutral-500">
        Loading report...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-8 py-6">
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

      <main className="mx-auto max-w-5xl px-8 pb-12 pt-4">
        <Link
          to="/dashboard"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50"
        >
          ←
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-medium tracking-tight text-neutral-900">
            {report.studentName}
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Activity · {report.assignmentTitle}
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-neutral-200/70 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-center justify-center text-center lg:min-w-[180px]">
              <p className="text-7xl font-semibold tabular-nums text-neutral-900">
                {report.understanding}
                <span className="text-3xl text-neutral-400">%</span>
              </p>
              <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">
                Understanding
              </p>
            </div>

            <div className="hidden h-16 w-px bg-neutral-200 lg:block" />

            <div className="min-w-0 max-w-2xl">
            <p className="text-lg leading-8 font-medium text-neutral-600">
                              {report.aiConclusion}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                  Confidence: {report.confidence}
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                  Clarity: {report.clarity}
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="my-15">
          <h2 className="text-xl font-medium">Defense Review</h2>

          <div className="my-6">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Behavior Summary
            </p>

            <MarkdownPreview
              content={report.behavioralSummaryMarkdown}
              className="mt-2 text-sm leading-7 text-neutral-600"
            />
          </div>

          <div className="mt-6">
            {report.qaReview?.map((item, index) => {
              const isOpen = openItems[index]

              return (
                <div
                  key={`${item.question_text}-${index}`}
                  className="border-b border-neutral-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(index)}
                    className="flex w-full cursor-pointer items-center justify-between px-2 py-8 text-left"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-medium text-blue-600">
                        Q
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-neutral-500">
                          Question {index + 1}
                        </p>
                        <p className="mt-1 text-[15px] leading-7 text-neutral-900">
                          {item.question_text}
                        </p>
                      </div>
                    </div>

                    <ChevronDown
                      className={`ml-4 h-5 w-5 flex-shrink-0 text-neutral-400 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <div
                    className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="min-h-0">
                      <div className="px-2 pb-6 pl-13">
                        <div className="flex gap-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-white">
                            <User size={12} />
                          </div>

                          <div className="flex-1">
                            <p className="text-xs uppercase tracking-wide text-neutral-500">
                              Student Answer
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-700">
                              {item.answer_text}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                          <div className="flex h-9 w-9 items-center justify-center text-neutral-900">
                            <Bot className="h-5 w-5" />
                          </div>

                          <div className="flex-1">
                            <p className="text-xs uppercase tracking-wide text-neutral-500">
                              {viewer === 'prof'
                                ? 'Alignment Analysis'
                                : 'Why this was marked this way'}
                            </p>

                            <MarkdownPreview
                              content={
                                viewer === 'prof'
                                  ? item.submission_alignment_markdown
                                  : item.why_marked_wrong_markdown
                              }
                              className="mt-2 text-sm leading-7 text-neutral-700"
                            />
                          </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                          <div className="flex h-9 w-9 items-center justify-center text-neutral-900">
                            <Bot className="h-5 w-5" />
                          </div>

                          <div className="flex-1">
                            <p className="text-xs uppercase tracking-wide text-neutral-500">
                              Behavioral Signals
                            </p>

                            <MarkdownPreview
                              content={item.behavioral_signal_markdown}
                              className="mt-2 text-sm leading-7 text-neutral-600"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {viewer !== 'prof' && (
          <div className="mt-8">
            <Link
              to={`/tutor/${reportId}`}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Ask Tutor
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}