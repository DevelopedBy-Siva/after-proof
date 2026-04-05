import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileCheck, Loader2, Bot, Mic, Clock3 } from 'lucide-react'
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
  const submitAnswerRef = useRef(() => {})
  const [session, setSession] = useState(null)
  const [question, setQuestion] = useState('')
  const [questionIndex, setQuestionIndex] = useState(1)
  const [questionTotal, setQuestionTotal] = useState(0)
  const [askNumber, setAskNumber] = useState(1)
  const [askTotal, setAskTotal] = useState(4)
  const [mode, setMode] = useState('loading')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [feed, setFeed] = useState([])
  const [timeLeft, setTimeLeft] = useState(30)
  const [timerRunning, setTimerRunning] = useState(false)

  useEffect(() => {
    api.get(`/api/session/${sessionId}`)
      .then((response) => {
        setSession(response.data)
        setQuestionTotal(response.data.questions.length)
      })
      .catch(() => setMode('error'))
  }, [sessionId])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setTimeLeft((current) => (timerRunning ? Math.max(current - 1, 0) : current))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [timerRunning])

  useEffect(() => {
    if (timeLeft === 0 && mode === 'listening' && !finishingRef.current) {
      submitAnswerRef.current()
    }
  }, [timeLeft, mode])

  useEffect(() => {
    const block = (event) => event.preventDefault()
    document.addEventListener('copy', block)
    document.addEventListener('cut', block)
    document.addEventListener('paste', block)
    document.addEventListener('contextmenu', block)
    return () => {
      document.removeEventListener('copy', block)
      document.removeEventListener('cut', block)
      document.removeEventListener('paste', block)
      document.removeEventListener('contextmenu', block)
    }
  }, [])

  useEffect(() => {
    const socket = createDefenseSocket()
    const Recognition = getRecognition()
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_session', { sessionId })
    })

    socket.on('session_ready', ({ totalCount, maxAsks }) => {
      setQuestionTotal(totalCount)
      setAskTotal(maxAsks || totalCount || 4)
      setMode('priming')
    })

    socket.on('ask_question', async ({ text, index, total, askNumber: nextAskNumber, askTotal: nextAskTotal }) => {
      setQuestion(text)
      setQuestionIndex(index)
      setQuestionTotal(total)
      setAskNumber(nextAskNumber || index)
      setAskTotal(nextAskTotal || total)
      setLiveTranscript('')
      transcriptRef.current = ''
      setTimeLeft(30)
      setMode('speaking')
      await speak(text)
      setTimerRunning(true)
      startListening(Recognition, socket)
    })

    socket.on('ask_followup', async ({ text, askNumber: nextAskNumber, askTotal: nextAskTotal }) => {
      setQuestion(text)
      setAskNumber(nextAskNumber || askNumber)
      setAskTotal(nextAskTotal || askTotal)
      setLiveTranscript('')
      transcriptRef.current = ''
      setTimeLeft(30)
      setMode('speaking')
      await speak(text)
      setTimerRunning(true)
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
      navigate(`/score/${reportId || response.data.reportId}?viewer=student`)
    })

    return () => {
      stopListening()
      socket.disconnect()
    }
  }, [sessionId, navigate, askNumber, askTotal])

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
    setTimerRunning(false)
    const answer = transcriptRef.current || '(no answer)'
    setFeed((current) => [...current, { question, answer }])
    socketRef.current?.emit('answer_done', { sessionId, transcript: answer })
    setMode('waiting')
  }

  submitAnswerRef.current = submitAnswer

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  function getStatusText() {
    if (mode === 'loading') return 'Loading your defense session'
    if (mode === 'priming') return 'Preparing the first question'
    if (mode === 'speaking') return 'Playing the question'
    if (mode === 'listening') return 'Speak your answer. This question closes automatically in 30 seconds.'
    if (mode === 'waiting') return 'Processing your answer'
    if (mode === 'complete') return 'Defense complete. Generating your report'
    return ''
  }

  if (mode === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-red-500">
        Unable to load defense session
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-white text-neutral-900"
      onCopy={(event) => event.preventDefault()}
      onPaste={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>

            <p className="text-[1.65rem] font-medium tracking-tight text-blue-600">
              AfterProof
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-8 pb-10 pt-4 lg:flex-row">
        <section className="flex-1 rounded-3xl border border-neutral-200 bg-white p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">Live Defense</p>
              <h1 className="mt-2 text-3xl font-medium tracking-tight text-neutral-900">
                {session?.assignmentTitle || 'Defense session'}
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600">
              <Clock3 className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="mt-10">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Prompt {askNumber} of {askTotal}
            </p>

            <h2 className="mt-4 max-w-4xl text-3xl font-medium leading-tight text-neutral-900">
              {question || 'Waiting for the first question...'}
            </h2>
          </div>

          <div className="mt-10 rounded-3xl border border-neutral-200 bg-neutral-50 p-8">
            <div className="flex items-center justify-center">
              {mode === 'listening' ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Mic className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-6 text-neutral-600">
              {getStatusText()}
            </p>

            {mode === 'listening' ? (
              <button
                onClick={submitAnswer}
                className="mx-auto mt-6 block rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Done answering
              </button>
            ) : null}
          </div>
        </section>

        <aside className="w-full rounded-3xl border border-neutral-200 bg-white p-6 lg:w-[24rem]">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-neutral-900">Transcript Feed</p>
          </div>

          <div className="mt-6 space-y-5">
            {liveTranscript ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Live</p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{liveTranscript}</p>
              </div>
            ) : null}

            {feed.map((entry, index) => (
              <div
                key={`${entry.question}-${index}`}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
              >
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Question
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-800">
                  {entry.question}
                </p>

                <p className="mt-4 text-xs uppercase tracking-wide text-neutral-500">
                  Answer
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  {entry.answer}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}