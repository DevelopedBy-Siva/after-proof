import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import { createDefenseSocket } from '../lib/socket'

function getRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition
}

export default function DefenseSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const socketRef = useRef(null)
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const finishingRef = useRef(false)
  const [session, setSession] = useState(null)
  const [question, setQuestion] = useState('')
  const [questionIndex, setQuestionIndex] = useState(1)
  const [questionTotal, setQuestionTotal] = useState(0)
  const [mode, setMode] = useState('loading')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [feed, setFeed] = useState([])
  const [timeLeft, setTimeLeft] = useState(600)
  const [timerRunning, setTimerRunning] = useState(false)

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setTimeLeft((current) => (timerRunning ? Math.max(current - 1, 0) : current))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [timerRunning])

  useEffect(() => {
    api.get(`/api/session/${sessionId}`)
      .then((response) => {
        setSession(response.data)
        setQuestionTotal(response.data.questions.length)
      })
      .catch(() => setMode('error'))
  }, [sessionId])

  useEffect(() => {
    const socket = createDefenseSocket()
    const Recognition = getRecognition()
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_session', { sessionId })
    })

    socket.on('session_ready', ({ totalCount }) => {
      setQuestionTotal(totalCount)
      setMode('priming')
    })

    socket.on('ask_question', async ({ text, index, total }) => {
      setQuestion(text)
      setQuestionIndex(index)
      setQuestionTotal(total)
      setLiveTranscript('')
      transcriptRef.current = ''
      setMode('speaking')
      setTimerRunning(true)
      await speak(text)
      startListening(Recognition, socket)
    })

    socket.on('ask_followup', async ({ text }) => {
      setQuestion(text)
      setLiveTranscript('')
      transcriptRef.current = ''
      setMode('speaking')
      await speak(text)
      startListening(Recognition, socket)
    })

    socket.on('session_complete', async ({ reportId }) => {
      if (finishingRef.current) {
        return
      }

      finishingRef.current = true
      setMode('complete')
      setTimerRunning(false)
      stopListening()
      socket.disconnect()
      const response = await api.post(`/api/session/${sessionId}/end`, { recordingGcsUrl: null })
      navigate(`/score/${reportId || response.data.reportId}`)
    })

    return () => {
      stopListening()
      socket.disconnect()
    }
  }, [sessionId, navigate])

  async function speak(text) {
    if ('speechSynthesis' in window) {
      await new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.02
        utterance.pitch = 1
        utterance.onend = resolve
        utterance.onerror = resolve
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
      })
      return
    }

    try {
      const response = await api.post('/api/tts', { text })
      const audio = new Audio(`data:${response.data.mimeType};base64,${response.data.audioBase64}`)
      await new Promise((resolve) => {
        audio.onended = resolve
        audio.play()
      })
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 300))
    }
  }

  function startListening(Recognition, socket) {
    setMode('listening')

    if (!Recognition) {
      return
    }

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
      transcriptRef.current = transcript
      setLiveTranscript(transcript)
      socket.emit('voice_chunk', { sessionId, text: transcript })
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
  }

  function submitAnswer() {
    if (mode !== 'listening' || finishingRef.current) {
      return
    }

    stopListening()
    const answer = transcriptRef.current || '(no answer)'
    setFeed((current) => [...current, { question, answer }])
    socketRef.current?.emit('answer_done', { sessionId, transcript: answer })
    setMode('waiting')
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  if (mode === 'error') {
    return <div className="min-h-screen bg-neutral-950 text-red-400 flex items-center justify-center">Unable to load defense session</div>
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_#030712,_#0f172a_45%,_#111827)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:flex-row lg:gap-8">
        <div className="flex-1 rounded-[2rem] border border-slate-800 bg-slate-950/60 p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-sky-300">Live Defense</p>
              <h1 className="mt-2 text-3xl font-semibold">{session?.assignmentTitle || 'Defense session'}</h1>
            </div>
            <div className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="mt-10">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Question {questionIndex} of {questionTotal || 0}
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight">{question || 'Waiting for the first question...'}</h2>
          </div>

          <div className="mt-12 rounded-[2rem] border border-slate-800 bg-slate-900/70 p-8">
            <div className="flex items-end justify-center gap-2">
              {[0, 1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-4 rounded-full bg-sky-400 transition-all ${mode === 'listening' ? 'animate-pulse' : ''}`}
                  style={{ height: `${36 + (bar % 3) * 24}px` }}
                />
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-slate-400">
              {mode === 'loading' && 'Loading your live defense session...'}
              {mode === 'priming' && 'Preparing the first question...'}
              {mode === 'speaking' && 'Question playing...'}
              {mode === 'listening' && 'Speak your answer and press done when finished.'}
              {mode === 'waiting' && 'Processing your answer...'}
              {mode === 'complete' && 'Defense complete. Generating your report...'}
            </p>

            {mode === 'listening' ? (
              <button
                onClick={submitAnswer}
                className="mx-auto mt-6 block rounded-2xl bg-sky-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-300"
              >
                Done answering
              </button>
            ) : null}
          </div>
        </div>

        <aside className="mt-8 w-full rounded-[2rem] border border-slate-800 bg-slate-950/60 p-6 lg:mt-0 lg:w-[24rem]">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Transcript Feed</p>
          <div className="mt-6 space-y-5">
            {liveTranscript ? (
              <div className="rounded-2xl border border-sky-900 bg-sky-950/30 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-sky-300">Live</p>
                <p className="mt-2 text-sm text-slate-200">{liveTranscript}</p>
              </div>
            ) : null}
            {feed.map((entry, index) => (
              <div key={`${entry.question}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Question</p>
                <p className="mt-2 text-sm text-slate-200">{entry.question}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">Answer</p>
                <p className="mt-2 text-sm text-slate-300">{entry.answer}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
