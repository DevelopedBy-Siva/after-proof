import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function DefenseSession() {
  const { token } = useParams()
  const navigate  = useNavigate()

  const [questions, setQuestions]     = useState([])
  const [currentQ, setCurrentQ]       = useState(0)
  const [phase, setPhase]             = useState('loading')
  const [transcript, setTranscript]   = useState([])
  const [currentText, setCurrentText] = useState('')
  const [timeLeft, setTimeLeft]       = useState(90)
  const [isFollowUp, setIsFollowUp]   = useState(false)
  const [pendingAnswer, setPendingAnswer] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const timerRef         = useRef(null)
  const fullTranscript   = useRef([])
  const questionsRef     = useRef([])

  const currentQRef   = useRef(0)
  const isFollowUpRef = useRef(false)

  useEffect(() => {
    axios.get(`${API}/api/defense/${token}`)
      .then(r => {
        setQuestions(r.data.questions)
        questionsRef.current = r.data.questions
        setPhase('ready')
      })
      .catch(console.error)
  }, [token])

  // Speak a question then move to recording
  const speakText = useCallback(async (text) => {
    setPhase('speaking')
    setCurrentText(text)
    try {
      const res   = await axios.post(`${API}/api/defense/tts`, { text })
      const audio = new Audio(`data:audio/mp3;base64,${res.data.audio}`)
      await new Promise(resolve => { audio.onended = resolve; audio.play() })
    } catch (e) {
      console.error('TTS failed, skipping audio', e)
    }
    setPhase('recording')
  }, [])

  // Start mic recording when phase becomes 'recording'
  useEffect(() => {
    if (phase !== 'recording') return
    chunksRef.current = []
    setTimeLeft(90)

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => stream.getTracks().forEach(t => t.stop())
      mr.start()

      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current)
            handleStopRecording()
            return 0
          }
          return t - 1
        })
      }, 1000)
    })

    return () => clearInterval(timerRef.current)
  }, [phase])

  function handleStopRecording() {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setPhase('thinking')
    // Trigger STT after a short delay to let final chunks flush
    setTimeout(() => setPhase('stt'), 300)
  }

  // STT phase — transcribe the recorded audio
  useEffect(() => {
    if (phase !== 'stt') return

    async function transcribeAudio() {
      try {
        const blob   = new Blob(chunksRef.current, { type: 'audio/webm' })
        const buffer = await blob.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        const res    = await axios.post(`${API}/api/defense/stt`, { audio: base64 })
        setPendingAnswer(res.data.transcript || '(no response)')
      } catch (e) {
        console.error('STT failed', e)
        setPendingAnswer('(no response)')
      }
    }

    transcribeAudio()
  }, [phase])

  // Process the answer once we have it
  useEffect(() => {
    if (pendingAnswer === null) return
  
    const qs     = questionsRef.current
    const qIndex = currentQRef.current
    const wasFollowUp = isFollowUpRef.current
  
    // Guard: don't go past the end
    if (qIndex >= qs.length) { finishSession(); return }
  
    const q      = wasFollowUp ? qs[qIndex].follow_up_probe : qs[qIndex].question
    const answer = pendingAnswer
    setPendingAnswer(null)
  
    fullTranscript.current.push({ question: q, answer })
    setTranscript([...fullTranscript.current])
  
    const isVague = answer.split(' ').length < 15 && !wasFollowUp
  
    if (isVague) {
      isFollowUpRef.current = true
      setIsFollowUp(true)
      speakText(qs[qIndex].follow_up_probe)
    } else {
      isFollowUpRef.current = false
      setIsFollowUp(false)
      const next = qIndex + 1
      // Stop exactly at the number of questions
      if (next >= qs.length) {
        finishSession()
      } else {
        currentQRef.current = next
        setCurrentQ(next)
        speakText(qs[next].question)
      }
    }
  }, [pendingAnswer])

  async function finishSession() {
    setPhase('done')

    const transcriptText = fullTranscript.current
      .map((t, i) => `Q${i + 1}: ${t.question}\nA: ${t.answer}`)
      .join('\n\n')

    await axios.post(`${API}/api/defense/evaluate`, { token })

    const submDoc = await axios.get(`${API}/api/submissions/${token}`)
    await axios.post('http://localhost:5001/evaluate', {
      submissionId: token,
      transcript:   transcriptText,
      rubric:       submDoc.data.assignment?.rubric || '',
    }).catch(console.error)

    navigate(`/results/${token}`)
  }

  if (phase === 'loading') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Loading defense session...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <h1 className="font-medium">Oral Defense</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">
            Question {Math.min(currentQ + 1, questions.length)} of {questions.length}
          </span>
          {phase === 'recording' && (
            <span className="text-red-400 text-sm font-medium">{timeLeft}s remaining</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-0">
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">

          {phase === 'ready' && (
            <div className="text-center max-w-lg">
              <h2 className="text-2xl font-semibold mb-3">Ready to begin?</h2>
              <p className="text-gray-400 mb-8">
                The AI will read each question aloud. Answer verbally.
                You have 90 seconds per question.
              </p>
              <button
                onClick={() => speakText(questions[0].question)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-medium transition"
              >
                Start Defense
              </button>
            </div>
          )}

          {['speaking', 'recording', 'thinking', 'stt'].includes(phase) && (
            <div className="w-full max-w-xl text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center transition-all ${
                phase === 'speaking'             ? 'bg-blue-600 animate-pulse' :
                phase === 'recording'            ? 'bg-red-600 animate-pulse' :
                'bg-gray-700'
              }`}>
                {phase === 'speaking'              && <span className="text-2xl">🔊</span>}
                {phase === 'recording'             && <span className="text-2xl">🎤</span>}
                {['thinking','stt'].includes(phase) && <span className="text-2xl">⏳</span>}
              </div>

              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
                {phase === 'speaking'              ? 'AI is asking...'          :
                 phase === 'recording'             ? 'Your turn — speak now'    :
                 'Processing your answer...'}
              </p>

              <p className="text-xl font-medium leading-relaxed">{currentText}</p>

              {phase === 'recording' && (
                <button
                  onClick={handleStopRecording}
                  className="mt-8 bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm transition"
                >
                  Done answering
                </button>
              )}
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center">
              <p className="text-green-400 text-xl font-medium mb-2">Defense complete</p>
              <p className="text-gray-400 text-sm">Generating your report...</p>
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
            </div>
          )}
        </div>

        {transcript.length > 0 && (
          <div className="w-80 border-l border-gray-800 px-6 py-6 overflow-y-auto">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">Transcript</p>
            <div className="flex flex-col gap-5">
              {transcript.map((t, i) => (
                <div key={i}>
                  <p className="text-xs text-blue-400 mb-1">Q{i + 1}</p>
                  <p className="text-sm text-gray-300 mb-2">{t.question}</p>
                  <p className="text-xs text-gray-500 italic">{t.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}