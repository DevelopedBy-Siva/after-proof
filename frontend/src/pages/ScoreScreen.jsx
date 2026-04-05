import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { FileCheck, Bot, User } from 'lucide-react'
import MarkdownPreview from '../components/MarkdownPreview'
import api from '../lib/api'

export default function ScoreScreen() {
  const { reportId } = useParams()
  const location = useLocation()
  const viewer = new URLSearchParams(location.search).get('viewer') || 'student'
  const [report, setReport] = useState(null)

  useEffect(() => {
    api.get(`/api/report/${reportId}`).then((response) => setReport(response.data))
  }, [reportId])

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-neutral-500">
        Loading report...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
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

        {/* Understanding + Summary */}
        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-fit rounded-3xl border border-neutral-200 bg-white px-8 py-8 text-center">
            <p className="text-sm text-neutral-500">Understanding</p>
            <p className="mt-3 text-5xl font-semibold tabular-nums text-neutral-900">
              {report.understanding}
              <span className="text-2xl text-neutral-400">%</span>
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Summary
              </p>

              <p className="mt-2 text-lg font-medium leading-8 text-neutral-900">
                {report.aiConclusion}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                Confidence: {report.confidence}
              </span>

              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                Clarity: {report.clarity}
              </span>
            </div>
          </div>
        </div>

        {/* Defense Review */}
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
            {report.qaReview?.map((item, index) => (
              <div
                key={`${item.question_text}-${index}`}
                className="flex gap-4 border-b border-neutral-100 py-6 last:border-b-0"
              >
                <div className="flex w-10 flex-col items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-medium text-blue-600">
                    Q
                  </div>
                  <div className="mt-2 h-full w-px bg-neutral-200" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">
                    Question {index + 1}
                  </p>

                  <p className="mt-2 text-[15px] leading-7 text-neutral-900">
                    {item.question_text}
                  </p>

                  <div className="mt-6 flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                    <User size={15} />
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
                    <div className="flex h-9 w-9 items-center justify-center text-blue-600">
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
                    <div className="flex h-9 w-9 items-center justify-center text-blue-600">
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
            ))}
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