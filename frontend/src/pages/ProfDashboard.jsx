import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'

const STATUS_STYLES = {
  pending: 'bg-neutral-800 text-neutral-300',
  uploaded: 'bg-sky-950 text-sky-300',
  analyzing: 'bg-amber-950 text-amber-300',
  ready_for_defense: 'bg-indigo-950 text-indigo-300',
  defending: 'bg-fuchsia-950 text-fuchsia-300',
  evaluating: 'bg-violet-950 text-violet-300',
  complete: 'bg-emerald-950 text-emerald-300',
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

    api.get('/api/assignments')
      .then((response) => setAssignments(response.data))
      .finally(() => setLoading(false))
  }, [navigate])

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="border-b border-neutral-800 bg-neutral-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-400">Defendly</p>
            {/* <h1 className="mt-1 text-xl font-semibold">Professor Dashboard</h1> */}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/assignments/new" className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-amber-300">
              New assignment
            </Link>
            <button
              onClick={() => {
                sessionStorage.removeItem('prof')
                navigate('/login')
              }}
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {loading ? <p className="text-neutral-400">Loading assignments...</p> : null}

        <div className="space-y-6">
          {assignments.map((assignment) => (
            <section key={assignment.id} className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex items-center gap-2">
  <h2 className="text-2xl font-semibold">{assignment.title}</h2>

  <div className="group relative">
    <span className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-neutral-700 text-xs text-neutral-300">
      ?
    </span>

    <div className="pointer-events-none absolute left-1/2 top-7 z-10 w-72 -translate-x-1/2 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-300 opacity-0 shadow-lg transition group-hover:opacity-100">
      {assignment.description}
    </div>
  </div>
</div>
              <p className="mt-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Due {new Date(assignment.deadline).toLocaleString()}
              </p>

              <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-800">
                <table className="min-w-full divide-y divide-neutral-800 text-sm">
                  <thead className="bg-neutral-950/70 text-left text-neutral-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {assignment.students.map((student) => (
                      <tr key={student.token}>
                        <td className="px-4 py-4">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-neutral-500">{student.email}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[student.status] || STATUS_STYLES.pending}`}>
                            {student.status.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-neutral-300">{student.overallScore ?? '—'}</td>
                        <td className="px-4 py-4">
                          {student.reportId ? (
                            <Link to={`/score/${student.reportId}?viewer=prof`} className="text-amber-400 transition hover:text-amber-300">
                              View report
                            </Link>
                          ) : (
                            <span className="text-neutral-500">Waiting</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
