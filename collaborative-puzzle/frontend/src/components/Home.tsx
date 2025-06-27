import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [gridSize, setGridSize] = useState(5)
  const [error, setError] = useState<string | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !sessionId.trim()) {
      setError('Please enter your name and session ID')
      return
    }

    try {
      setJoinLoading(true)
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
      setJoinLoading(false)
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedFile) {
      setError('Please enter your name and select an image')
      return
    }

    try {
      setCreateLoading(true)
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
      setCreateLoading(false)
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full animate-fadeIn">
        <h1 className="text-5xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Collaborative Jigsaw Puzzle
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Solve puzzles together with friends in real-time
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 animate-fadeIn">
            {error}
          </div>
        )}
        
        {/* Common name input */}
        <div className="glass-morphism rounded-2xl shadow-xl p-6 mb-6 card-hover">
          <label className="block text-gray-700 text-sm font-semibold mb-3">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="Enter your name"
            required
          />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Join existing session */}
          <div className="glass-morphism rounded-2xl shadow-xl p-6 card-hover">
            <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Join Session</h2>
            <form onSubmit={handleJoinSession}>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-3">
                  Session ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter session ID"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Or visit the shared link directly
                </p>
              </div>
              
              <button
                type="submit"
                disabled={joinLoading || !name.trim()}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joinLoading ? 'Joining...' : 'Join Session'}
              </button>
            </form>
          </div>
          
          {/* Create new session */}
          <div className="glass-morphism rounded-2xl shadow-xl p-6 card-hover">
            <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">Create New Session</h2>
            <form onSubmit={handleCreateSession}>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-3">
                  Upload Image
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  JPG or PNG, max 10MB
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-3">
                  Grid Size
                </label>
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value={3}>3x3 (9 pieces)</option>
                  <option value={5}>5x5 (25 pieces)</option>
                  <option value={8}>8x8 (64 pieces)</option>
                </select>
              </div>
              
              <button
                type="submit"
                disabled={createLoading || !selectedFile || !name.trim()}
                className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading ? 'Creating...' : 'Create Session'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home