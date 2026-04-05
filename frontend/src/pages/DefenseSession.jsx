import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileCheck, Loader2, Bot, Mic, Clock3 } from 'lucide-react'
import api from '../lib/api'
import { createDefenseSocket } from '../lib/socket'

function getSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
  ]

  return candidates.find((value) => window.MediaRecorder?.isTypeSupported?.(value)) || ''
}

export default function DefenseSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const socketRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  const finishingRef = useRef(false)
  const submitAnswerRef = useRef(() => {})
  const [session, setSession] = useState(null)
  const [question, setQuestion] = useState('')
  const [questionIndex, setQuestionIndex] = useState(1)
  const [questionTotal, setQuestionTotal] = useState(0)
  const [askNumber, setAskNumber] = useState(1)
  const [askTotal, setAskTotal] = useState(4)
  const [mode, setMode] = useState('loading')
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
      setTimeLeft(30)
      setMode('speaking')
      await speak(text)
      setTimerRunning(true)
      await startListening(socket)
    })

    socket.on('ask_followup', async ({ text, askNumber: nextAskNumber, askTotal: nextAskTotal }) => {
      setQuestion(text)
      setAskNumber(nextAskNumber || askNumber)
      setAskTotal(nextAskTotal || askTotal)
      setTimeLeft(30)
      setMode('speaking')
      await speak(text)
      setTimerRunning(true)
      await startListening(socket)
    })

    socket.on('session_complete', async ({ reportId }) => {
      if (finishingRef.current) {
        return
      }

      finishingRef.current = true
      setMode('complete')
      setTimerRunning(false)
      await stopListening()
      socket.disconnect()
      const response = await api.post(`/api/session/${sessionId}/end`, { recordingGcsUrl: null })
      navigate(`/score/${reportId || response.data.reportId}?viewer=student`)
    })

    return () => {
      stopListening()
      socket.disconnect()
    }
  }, [sessionId, navigate])

  async function speak(text) {
    try {
      const response = await api.post('/api/tts', { text })
      const audio = new Audio(`data:${response.data.mimeType};base64,${response.data.audioBase64}`)
      await new Promise((resolve) => {
        audio.onended = resolve
        audio.onerror = resolve
        audio.play()
      })
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 300))
    }
  }

  async function startListening(socket) {
    setMode('listening')

    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setMode('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      audioChunksRef.current = []
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.start(250)
      socket.emit('voice_chunk', { sessionId, text: 'Recording answer...' })
    } catch {
      setMode('error')
    }
  }

  async function stopListening() {
    const recorder = mediaRecorderRef.current
    if (!recorder) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      return null
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        mediaRecorderRef.current = null
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop())
          mediaStreamRef.current = null
        }

        resolve(blob)
      }

      recorder.stop()
    })
  }

  async function transcribeAnswer(audioBlob) {
    if (!audioBlob || audioBlob.size === 0) {
      return ''
    }

    const formData = new FormData()
    formData.append('audio', audioBlob, `answer.${audioBlob.type.includes('ogg') ? 'ogg' : 'webm'}`)

    const response = await api.post(`/api/session/${sessionId}/transcribe`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data.transcript || ''
  }

  async function submitAnswer() {
    if (mode !== 'listening' || finishingRef.current) {
      return
    }

    setTimerRunning(false)
    setMode('transcribing')

    try {
      const audioBlob = await stopListening()
      const transcript = await transcribeAnswer(audioBlob)
      const answer = transcript || '(no answer)'

      setFeed((current) => [...current, { question, answer }])
      socketRef.current?.emit('answer_done', { sessionId, transcript: answer })
      setMode('waiting')
    } catch {
      const answer = '(transcription failed)'
      setFeed((current) => [...current, { question, answer }])
      socketRef.current?.emit('answer_done', { sessionId, transcript: answer })
      setMode('waiting')
    }
  }

  submitAnswerRef.current = submitAnswer

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  function getStatusText() {
    if (mode === 'loading') return 'Loading your knowledge check session'
    if (mode === 'priming') return 'Preparing the first question'
    if (mode === 'speaking') return 'Playing the question'
    if (mode === 'listening') return 'Speak your answer. Audio is being recorded and this question closes automatically in 30 seconds.'
    if (mode === 'transcribing') return 'Transcribing your answer'
    if (mode === 'waiting') return 'Processing your answer'
    if (mode === 'complete') return 'Knowledge check complete. Generating your report'
    return ''
  }

  if (mode === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-red-500">
        Unable to load knowledge check session
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
              <p className="text-sm font-medium text-blue-600">Knowledge Check</p>
              <h1 className="mt-2 text-3xl font-medium tracking-tight text-neutral-900">
                {session?.assignmentTitle || 'Knowledge Check'}
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
            {mode === 'listening' ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Recording</p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  Capturing microphone audio.
                </p>
              </div>
            ) : null}

            {mode === 'transcribing' ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Transcribing</p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  Converting your recorded answer into text.
                </p>
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
