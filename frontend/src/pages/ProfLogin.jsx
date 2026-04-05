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
      <div className="w-full max-w-md">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-400">Defendly</p>
        <h1 className="mt-3 text-3xl font-semibold">Professor Login</h1>

        <form onSubmit={handleLogin} className="mt-10 space-y-6">
          <div className="border-b border-neutral-700 focus-within:border-amber-400 transition">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full bg-transparent py-3 outline-none placeholder:text-neutral-500"
            />
          </div>

          <div className="border-b border-neutral-700 focus-within:border-amber-400 transition">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full bg-transparent py-3 outline-none placeholder:text-neutral-500"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          {/* Autofill button - improved placement & styling */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEmail(PROF_EMAIL)
                setPassword(PROF_PASSWORD)
                setError('')
              }}
              className="text-xs text-amber-400 underline underline-offset-4 hover:text-amber-300 transition cursor-pointer"
            >
              Autofill demo credentials
            </button>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-medium text-neutral-950 transition hover:bg-amber-300 cursor-pointer"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}