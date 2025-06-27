import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Puzzle Session
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your name to join the collaborative puzzle
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleJoin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isJoining}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isJoining
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {isJoining ? 'Joining...' : 'Join Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JoinSession