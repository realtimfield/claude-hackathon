import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from '../config/axios'

const JoinSession: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [name, setName] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      // First check if the session exists
      await axios.get(`/api/sessions/${sessionId}`)
      
      // Join the session
      const response = await axios.post(`/api/sessions/${sessionId}/join`, {
        name: name.trim()
      })

      // Store user info in localStorage
      localStorage.setItem('userId', response.data.id)
      localStorage.setItem('userName', response.data.name)
      
      // Force a page reload to re-initialize the PuzzleGame component
      window.location.href = `/puzzle/${sessionId}`
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Session not found')
      } else {
        setError('Failed to join session. Please try again.')
      }
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fadeIn">
        <div className="glass-morphism rounded-2xl shadow-xl p-8">
          <h2 className="text-center text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Join Puzzle Session
          </h2>
          <p className="text-center text-sm text-gray-600 mb-6">
            Enter your name to join the collaborative puzzle
          </p>
          <form className="space-y-6" onSubmit={handleJoin}>
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700 text-center">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isJoining}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Joining...' : 'Join Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default JoinSession