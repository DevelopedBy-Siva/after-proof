import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

const STATUS_COLOR = {
  pending:           'bg-gray-700 text-gray-300',
  analyzing:         'bg-yellow-900 text-yellow-300',
  ready_for_defense: 'bg-blue-900 text-blue-300',
  evaluating:        'bg-purple-900 text-purple-300',
  complete:          'bg-green-900 text-green-300',
  error:             'bg-red-900 text-red-300',
}

export default function ProfDashboard() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('prof_authed')) navigate('/login')
  }, [])

  useEffect(() => {
    axios.get(`${API}/api/assignments`)
      .then(r => setAssignments(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Defendly</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">prof@defendly.com</span>
          <Link
            to="/assignments/new"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            + New Assignment
          </Link>
          <button
            onClick={() => { localStorage.clear(); navigate('/login') }}
            className="text-gray-500 hover:text-gray-300 text-sm transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-10">
        <h2 className="text-xl font-medium mb-6">Assignments</h2>

        {loading && <p className="text-gray-400">Loading...</p>}

        {!loading && assignments.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <p className="text-lg">No assignments yet</p>
            <Link to="/assignments/new" className="text-blue-500 text-sm mt-2 inline-block">
              Create your first assignment →
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {assignments.map(a => (
            <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-lg">{a.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{a.description}</p>
                </div>
                <span className="text-gray-500 text-xs">
                  Due {new Date(a.deadline).toLocaleDateString()}
                </span>
              </div>

              <p className="text-gray-500 text-xs mb-4">
                Rubric: {a.rubric}
              </p>

              {/* Student rows */}
              <div className="flex flex-col gap-2">
                {a.students?.map(s => (
                  <div
                    key={s.token}
                    className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
                  >
                    <div>
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className="text-gray-500 text-xs ml-3">{s.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StudentStatus token={s.token} />
                      <Link
                        to={`/results/${s.token}`}
                        className="text-blue-400 hover:text-blue-300 text-xs transition"
                      >
                        View report →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StudentStatus({ token }) {
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    axios.get(`${API}/api/submissions/${token}`)
      .then(r => setStatus(r.data.status))
      .catch(() => {})

    // Poll every 5 seconds
    const interval = setInterval(() => {
      axios.get(`${API}/api/submissions/${token}`)
        .then(r => setStatus(r.data.status))
        .catch(() => {})
    }, 5000)

    return () => clearInterval(interval)
  }, [token])

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[status] || STATUS_COLOR.pending}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}