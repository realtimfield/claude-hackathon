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
    <div className="glass-morphism rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
      <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
        🏆 Puzzle Complete! 🏆
      </h2>
      
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Final Scores:</h3>
        
        {sortedScores.map((score, index) => (
          <div
            key={score.userId}
            className={`flex items-center justify-between p-4 rounded-xl transition-all ${
              index === 0 ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 shadow-md' : 
              index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300' :
              index === 2 ? 'bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200' :
              'bg-white/50 border border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
              </span>
              <span
                className="w-5 h-5 rounded-full shadow-sm"
                style={{ backgroundColor: score.color, boxShadow: `0 0 10px ${score.color}40` }}
              />
              <span className="font-semibold text-gray-800">{score.name}</span>
            </div>
            <div className="text-xl font-bold text-gray-700">
              {score.score} <span className="text-sm font-normal text-gray-600">{score.score === 1 ? 'piece' : 'pieces'}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
        <p className="text-gray-700 font-medium">
          Total pieces: <span className="font-bold text-purple-600">{session.pieces.length}</span>
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Great teamwork! 🎉
        </p>
      </div>
    </div>
  )
}

export default Scoreboard