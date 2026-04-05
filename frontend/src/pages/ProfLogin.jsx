import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCheck } from 'lucide-react'

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
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">
      
      {/* Header */}
      <header className="bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-8 py-5">
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

      {/* Centered Content */}
      <main className="flex flex-1 items-center justify-center px-8">
        
        <div className="w-full max-w-md">
          
          {/* Title */}
          <h1 className="text-3xl font-medium tracking-tight">
            Instructor Login
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Sign in to manage activities and review reports
          </p>

          {/* Form */}
          <form
            onSubmit={handleLogin}
            className="mt-10 space-y-6"
          >
            
            {/* Email */}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full border-b border-neutral-300 bg-transparent py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-500"
            />

            {/* Password */}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full border-b border-neutral-300 bg-transparent py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-500"
            />

            {/* Error */}
            {error ? (
              <p className="text-sm font-medium text-red-500">{error}</p>
            ) : null}

            {/* Autofill */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setEmail(PROF_EMAIL)
                  setPassword(PROF_PASSWORD)
                  setError('')
                }}
                className="cursor-default text-xs font-medium text-blue-600 hover:text-blue-700 transition" >
                Autofill demo credentials
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="cursor-default mt-4 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Sign in
            </button>

          </form>
        </div>

      </main>
    </div>
  )
}