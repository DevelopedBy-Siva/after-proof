import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PROF_EMAIL = 'prof@university.edu'
const PROF_PASSWORD = 'defendly2024'

export default function ProfLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleLogin(event) {
    event.preventDefault()

    if (email === PROF_EMAIL && password === PROF_PASSWORD) {
      sessionStorage.setItem('prof', 'true')
      navigate('/dashboard')
      return
    }

    setError('Invalid credentials')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/90 p-10 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-400">Defendly</p>
        <h1 className="mt-3 text-3xl font-semibold">Professor Login</h1>
        <p className="mt-2 text-sm text-neutral-400">Hardcoded demo credentials for the hackathon flow.</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="prof@university.edu"
            className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-amber-400"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none transition focus:border-amber-400"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-medium text-neutral-950 transition hover:bg-amber-300"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">Demo: prof@university.edu / defendly2024</p>
      </div>
    </div>
  )
}
