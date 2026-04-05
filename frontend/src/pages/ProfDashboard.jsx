import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { FileCheck, Loader2 } from 'lucide-react'

const STATUS_STYLES = {
  pending: 'bg-neutral-100 text-neutral-700',
  uploaded: 'bg-sky-50 text-sky-700',
  analyzing: 'bg-amber-50 text-amber-700',
  ready_for_defense: 'bg-indigo-50 text-indigo-700',
  defending: 'bg-fuchsia-50 text-fuchsia-700',
  evaluating: 'bg-violet-50 text-violet-700',
  complete: 'bg-emerald-50 text-emerald-700',
}

export default function ProfDashboard() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionStorage.getItem('prof')) {
      navigate('/login')
      return
    }

    api
      .get('/api/assignments')
      .then((response) => setAssignments(response.data))
      .finally(() => setLoading(false))
  }, [navigate])

  return (
    <div className="min-h-screen bg-white text-neutral-900">
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

          <div className="flex items-center gap-3">
            <Link
              to="/assignments/new"
              className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              New activity
            </Link>

            <button
              onClick={() => {
                sessionStorage.removeItem('prof')
                navigate('/login')
              }}
              className="inline-flex cursor-pointer items-center rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-10">
        {loading ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-neutral-500">
              Loading activities...
            </p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="w-full max-w-xl bg-white px-8 py-12 text-center">
              <h2 className="mt-5 text-2xl font-medium tracking-tight text-neutral-900">
                No activities yet
              </h2>

              <p className="mt-3 text-sm leading-6 text-neutral-500">
                You have not created any activities yet. Start by creating a new
                activity to assign students, track progress, and review reports.
              </p>

              <div className="mt-6">
                <Link
                  to="/assignments/new"
                  className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Create new activity
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {assignments.map((assignment) => (
              <section
                key={assignment.id}
                className="overflow-hidden rounded-3xl border border-neutral-200 bg-white"
              >
                <div className="px-8 py-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[1.4rem] font-medium tracking-tight text-neutral-900">
                          {assignment.title}
                        </h2>

                        <div className="group relative">
                          <span className="flex h-7 w-7 cursor-pointer items-center justify-center ml-2 rounded-full border border-neutral-200 bg-white text-sm font-medium text-neutral-500 transition hover:border-blue-200 hover:text-blue-600">
                            ?
                          </span>

                          <div className="pointer-events-none absolute left-1/2 top-8 z-10 w-72 -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-3 text-xs leading-5 text-neutral-600 opacity-0 shadow-md transition group-hover:opacity-100">
                            {assignment.description}
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-neutral-500">
                        Due {new Date(assignment.deadline).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 overflow-hidden rounded-2xl border border-neutral-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-neutral-50 text-left">
                        <tr className="border-b border-neutral-200">
                          <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
                            Student
                          </th>
                          <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
                            Status
                          </th>
                          <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
                            Score
                          </th>
                          <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white">
                        {assignment.students.map((student) => (
                          <tr
                            key={student.token}
                            className="border-b border-neutral-100 transition hover:bg-blue-50/40 last:border-b-0"
                          >
                            <td className="px-5 py-4">
                              <div className="font-medium text-neutral-900">
                                {student.name}
                              </div>
                              <div className="mt-1 text-xs text-neutral-500">
                                {student.email}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[student.status] || STATUS_STYLES.pending}`}
                              >
                                {student.status.replaceAll('_', ' ')}
                              </span>
                            </td>

                            <td className="px-5 py-4 font-medium text-neutral-700">
                              {student.understanding ?? '—'}
                            </td>

                            <td className="px-5 py-4">
                              {student.reportId ? (
                                <Link
                                  to={`/score/${student.reportId}?viewer=prof`}
                                  className="inline-flex cursor-pointer items-center rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-50 active:scale-95"
                                >
                                  View report
                                </Link>
                              ) : (
                                <span className="text-sm text-neutral-400">
                                  Waiting
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}