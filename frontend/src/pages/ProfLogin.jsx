import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Hardcoded for hackathon demo
const PROF_EMAIL    = 'prof@defendly.com'
const PROF_PASSWORD = 'demo1234'

export default function ProfLogin() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  function handleLogin(e) {
    e.preventDefault()
    if (email === PROF_EMAIL && password === PROF_PASSWORD) {
      localStorage.setItem('prof_authed', 'true')
      navigate('/dashboard')
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-md">
        <h1 className="text-white text-2xl font-semibold mb-1">Defendly</h1>
        <p className="text-gray-400 text-sm mb-8">Professor login</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none border border-gray-700 focus:border-blue-500 transition"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none border border-gray-700 focus:border-blue-500 transition"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3 font-medium transition mt-2"
          >
            Sign in
          </button>
        </form>

        <p className="text-gray-600 text-xs mt-6 text-center">
          demo: prof@defendly.com / demo1234
        </p>
      </div>
    </div>
  )
}