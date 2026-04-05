import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function CreateAssignment() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({
    title:       '',
    description: '',
    rubric:      '',
    difficulty:  'medium',
    deadline:    '',
  })

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
        const payload = {
            ...form,
            deadline: form.deadline ? new Date(form.deadline).toISOString() : '',
          }
          
          const res = await axios.post(`${API}/api/assignments`, payload)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-8 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm transition">
          ← Dashboard
        </Link>
        <h1 className="text-lg font-semibold">New Assignment</h1>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Title</label>
            <input
              required
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="e.g. Explain gradient descent"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Description</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="What should students write about?"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Rubric</label>
            <textarea
              required
              rows={4}
              value={form.rubric}
              onChange={e => update('rubric', e.target.value)}
              placeholder="What concepts must students demonstrate to pass? e.g. Must show understanding of learning rate, convergence, and momentum."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={e => update('difficulty', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Deadline</label>
            <input
  required
  type="datetime-local"
  value={form.deadline}
  onChange={e => update('deadline', e.target.value)}
  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition"
/>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium transition"
          >
            {loading ? 'Creating & sending invites...' : 'Create Assignment'}
          </button>
        </form>
      </div>
    </div>
  )
}