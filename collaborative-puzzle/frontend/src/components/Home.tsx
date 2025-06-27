import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [gridSize, setGridSize] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !sessionId.trim()) {
      setError('Please enter your name and session ID')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Join session
      const response = await axios.post(`/api/sessions/${sessionId}/join`, { name: name.trim() })
      const user = response.data
      
      // Store user info and navigate to puzzle
      localStorage.setItem('userId', user.id)
      localStorage.setItem('userName', user.name)
      navigate(`/puzzle/${sessionId}`)
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Session not found')
      } else {
        setError('Failed to join session')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedFile) {
      setError('Please enter your name and select an image')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Create session
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('gridSize', gridSize.toString())
      
      const createResponse = await axios.post('/api/sessions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const newSessionId = createResponse.data.sessionId
      
      // Join the created session automatically
      const joinResponse = await axios.post(`/api/sessions/${newSessionId}/join`, { name: name.trim() })
      const user = joinResponse.data
      
      // Store user info and navigate to puzzle
      localStorage.setItem('userId', user.id)
      localStorage.setItem('userName', user.name)
      navigate(`/puzzle/${newSessionId}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB')
        return
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Invalid file type. Only JPG and PNG are allowed')
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Collaborative Jigsaw Puzzle
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Join existing session */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Join Session</h2>
            <form onSubmit={handleJoinSession}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Session ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter session ID"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  Or visit the shared link directly
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? 'Joining...' : 'Join Session'}
              </button>
            </form>
          </div>
          
          {/* Create new session */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Create New Session</h2>
            <form onSubmit={handleCreateSession}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  JPG or PNG, max 10MB
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Grid Size
                </label>
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>3x3 (9 pieces)</option>
                  <option value={5}>5x5 (25 pieces)</option>
                  <option value={8}>8x8 (64 pieces)</option>
                </select>
              </div>
              
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Create Session'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home