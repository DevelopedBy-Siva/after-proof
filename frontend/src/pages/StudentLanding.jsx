import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function StudentLanding() {
  const { token }               = useParams()
  const navigate                = useNavigate()
  const [data, setData]         = useState(null)
  const [error, setError]       = useState('')
  const [file, setFile]         = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    axios.get(`${API}/api/submissions/${token}`)
      .then(r => setData(r.data))
      .catch(() => setError('Invalid or expired link.'))
  }, [token])

  // Poll for status change after upload
  useEffect(() => {
    if (!data) return
    if (data.status !== 'analyzing') return

    const interval = setInterval(() => {
      axios.get(`${API}/api/submissions/${token}`)
        .then(r => {
          setData(r.data)
          if (r.data.status === 'ready_for_defense') {
            clearInterval(interval)
            navigate(`/defense/${token}`)
          }
        })
        .catch(() => {})
    }, 3000)

    return () => clearInterval(interval)
  }, [data?.status])

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setUploadError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post(`${API}/api/submissions/${token}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setData(d => ({ ...d, status: 'analyzing' }))
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-red-400">{error}</p>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-8 py-12">

        <h1 className="text-2xl font-semibold mb-1">
          Hi, {data.studentName}
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Submit your work below to begin your oral defense.
        </p>

        {/* Assignment details */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="font-medium text-lg mb-1">{data.assignment.title}</h2>
          <p className="text-gray-400 text-sm mb-4">{data.assignment.description}</p>

          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Rubric</p>
            <p className="text-sm text-gray-300">{data.assignment.rubric}</p>
          </div>

          <div className="flex gap-4 mt-4">
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">Difficulty</p>
              <p className="text-sm font-medium capitalize">{data.assignment.difficulty}</p>
            </div>
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">Deadline</p>
              <p className="text-sm font-medium">
                {new Date(data.assignment.deadline).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Upload or status */}
        {data.status === 'pending' && (
          <form onSubmit={handleUpload} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-medium mb-4">Upload your submission</h3>

            <label className="block border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => setFile(e.target.files[0])}
              />
              {file
                ? <p className="text-blue-400">{file.name}</p>
                : <p className="text-gray-500">Click to select PDF or Word document</p>
              }
            </label>

            {uploadError && (
              <p className="text-red-400 text-sm mt-3">{uploadError}</p>
            )}

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium transition"
            >
              {uploading ? 'Uploading...' : 'Submit Assignment'}
            </button>
          </form>
        )}

        {data.status === 'analyzing' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Analyzing your submission...</p>
            <p className="text-gray-500 text-sm mt-1">
              Your defense questions are being generated. This takes about 30 seconds.
            </p>
          </div>
        )}

        {data.status === 'ready_for_defense' && (
          <div className="bg-gray-900 border border-green-800 rounded-xl p-8 text-center">
            <p className="text-green-400 font-medium text-lg mb-2">
              Your defense session is ready
            </p>
            <button
              onClick={() => navigate(`/defense/${token}`)}
              className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-6 py-3 font-medium transition mt-2"
            >
              Begin Defense →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}