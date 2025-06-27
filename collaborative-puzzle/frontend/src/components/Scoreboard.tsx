import React from 'react'
import { PuzzleSession } from '../types/types'

interface ScoreboardProps {
  session: PuzzleSession
}

const Scoreboard: React.FC<ScoreboardProps> = ({ session }) => {
  // Calculate scores - count how many pieces each user placed correctly
  const scores: { [userId: string]: { name: string; score: number; color: string } } = {}
  
  // Initialize scores for all users
  Object.values(session.users).forEach(user => {
    scores[user.id] = { name: user.name, score: 0, color: user.color }
  })
  
  // Count pieces placed by each user
  session.pieces.forEach(piece => {
    if (piece.placedBy && scores[piece.placedBy]) {
      scores[piece.placedBy].score++
    }
  })
  
  // Sort users by score (descending)
  const sortedScores = Object.entries(scores)
    .sort(([, a], [, b]) => b.score - a.score)
    .map(([userId, data]) => ({ userId, ...data }))
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        🏆 Puzzle Complete! 🏆
      </h2>
      
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Final Scores:</h3>
        
        {sortedScores.map((score, index) => (
          <div
            key={score.userId}
            className={`flex items-center justify-between p-3 rounded-lg ${
              index === 0 ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
              </span>
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: score.color }}
              />
              <span className="font-medium text-gray-800">{score.name}</span>
            </div>
            <div className="text-xl font-bold text-gray-700">
              {score.score} {score.score === 1 ? 'piece' : 'pieces'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Total pieces: {session.pieces.length}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Great teamwork! 🎉
        </p>
      </div>
    </div>
  )
}

export default Scoreboard