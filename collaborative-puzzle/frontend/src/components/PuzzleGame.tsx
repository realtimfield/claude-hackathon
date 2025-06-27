import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import {
  setSession,
  updatePiece,
  placePiece,
  lockPiece,
  unlockPiece,
  addUser,
  removeUser,
  updateUserCursor,
  setPuzzleComplete,
  setLoading,
  setError,
} from '../features/puzzleSlice'
import { setCurrentUser, setSessionId } from '../features/userSlice'
import { MessageType, WebSocketMessage } from '../types/types'
import axios from 'axios'
import PuzzlePiece from './PuzzlePiece'
import UserCursor from './UserCursor'
import JoinSession from './JoinSession'
import Scoreboard from './Scoreboard'
import { throttle } from '../utils/throttle'

const PuzzleGame: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  
  const { session, isLoading, error, isCompleted } = useSelector((state: RootState) => state.puzzle)
  const { currentUser } = useSelector((state: RootState) => state.user)
  
  const wsRef = useRef<WebSocket | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 })
  const [needsToJoin, setNeedsToJoin] = useState(false)
  const [showScoreboard, setShowScoreboard] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    const userId = localStorage.getItem('userId')
    const userName = localStorage.getItem('userName')
    
    if (!userId || !userName) {
      setNeedsToJoin(true)
      return
    }

    dispatch(setSessionId(sessionId))
    loadSession()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [sessionId])

  useEffect(() => {
    const updateContainerOffset = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerOffset({ x: rect.left, y: rect.top })
      }
    }

    // Update on mount and when session data changes
    // Use requestAnimationFrame to ensure DOM is rendered
    const rafId = requestAnimationFrame(() => {
      updateContainerOffset()
    })

    // Update on window resize or scroll
    window.addEventListener('resize', updateContainerOffset)
    window.addEventListener('scroll', updateContainerOffset)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateContainerOffset)
      window.removeEventListener('scroll', updateContainerOffset)
    }
  }, [session]) // Re-run when session data loads

  const loadSession = async () => {
    try {
      dispatch(setLoading(true))
      const response = await axios.get(`/api/sessions/${sessionId}`)
      dispatch(setSession(response.data))
      
      const userId = localStorage.getItem('userId')!
      connectWebSocket(userId)
    } catch (err) {
      dispatch(setError('Failed to load session'))
      setTimeout(() => navigate('/'), 2000)
    } finally {
      dispatch(setLoading(false))
    }
  }

  const connectWebSocket = (userId: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/puzzle/${sessionId}?userId=${userId}`
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data)
      handleWebSocketMessage(message)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      dispatch(setError('Connection error'))
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }
  }

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case MessageType.SESSION_STATE:
        dispatch(setSession(message.data.session))
        dispatch(setCurrentUser(message.data.session.users[message.data.userId]))
        break
        
      case MessageType.USER_JOIN:
        dispatch(addUser(message.data.user))
        break
        
      case MessageType.USER_LEAVE:
        dispatch(removeUser(message.data.userId))
        break
        
      case MessageType.PIECE_MOVE:
        dispatch(updatePiece({
          pieceId: message.data.pieceId,
          x: message.data.x,
          y: message.data.y,
        }))
        break
        
      case MessageType.PIECE_PLACED:
        dispatch(placePiece({
          pieceId: message.data.pieceId,
          x: message.data.x,
          y: message.data.y,
        }))
        break
        
      case MessageType.PIECE_LOCK:
        dispatch(lockPiece({
          pieceId: message.data.pieceId,
          userId: message.data.userId,
        }))
        break
        
      case MessageType.PIECE_UNLOCK:
        dispatch(unlockPiece({ pieceId: message.data.pieceId }))
        break
        
      case MessageType.CURSOR_MOVE:
        dispatch(updateUserCursor({
          userId: message.data.userId,
          x: message.data.x,
          y: message.data.y,
        }))
        break
        
      case MessageType.PUZZLE_COMPLETE:
        dispatch(setPuzzleComplete())
        setShowScoreboard(true)
        break
    }
  }

  const sendMessage = (type: MessageType, data: Record<string, any>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, data }
      wsRef.current.send(JSON.stringify(message))
    }
  }

  const handleCursorMove = useCallback((x: number, y: number) => {
    sendMessage(MessageType.CURSOR_MOVE, { x, y })
  }, [])

  const throttledHandleMouseMove = useMemo(
    () => throttle((e: React.MouseEvent) => {
      if (!containerRef.current) return
      
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      handleCursorMove(x, y)
    }, 50),
    [handleCursorMove]
  )

  const handlePieceMove = (pieceId: number, x: number, y: number) => {
    sendMessage(MessageType.PIECE_MOVE, { pieceId, x, y })
  }

  const handlePieceLock = (pieceId: number) => {
    sendMessage(MessageType.PIECE_LOCK, { pieceId })
  }

  const handlePieceUnlock = (pieceId: number) => {
    sendMessage(MessageType.PIECE_UNLOCK, { pieceId })
  }

  const handlePieceRelease = (pieceId: number, x: number, y: number) => {
    sendMessage(MessageType.PIECE_RELEASE, { pieceId, x, y })
  }

  if (needsToJoin) {
    return <JoinSession />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mx-auto mb-4"></div>
          </div>
          <div className="text-2xl text-gray-700 font-medium">Loading puzzle...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-red-600 bg-red-50 px-6 py-4 rounded-xl animate-fadeIn">{error}</div>
      </div>
    )
  }

  if (!session || !currentUser) {
    return null
  }

  return (
    <div className="min-h-screen flex">
      {/* Left sidebar for players */}
      <div className="w-64 glass-morphism shadow-xl p-6 animate-slideInLeft">
        <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Players</h3>
        <div className="space-y-3">
          {Object.values(session.users).map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 bg-white/30 rounded-xl transition-all hover:bg-white/40"
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: user.color, boxShadow: `0 0 10px ${user.color}40` }}
              />
              <span className="text-sm font-medium text-gray-700 truncate">
                {user.name}
                {user.id === currentUser.id && <span className="text-purple-600 font-semibold"> (You)</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-6">
        <div className="glass-morphism rounded-2xl shadow-xl p-6 mb-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">Collaborative Puzzle</h1>
              <p className="text-gray-600">
                <span className="font-medium">Session:</span> <code className="bg-gray-100 px-2 py-1 rounded text-sm">{sessionId?.slice(0, 8)}...</code> | 
                <span className="font-medium ml-2">Grid:</span> {session.gridSize}×{session.gridSize}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-700 font-semibold">{currentUser.name}</p>
              <span
                className="inline-block w-6 h-6 rounded-full mt-2 shadow-md"
                style={{ backgroundColor: currentUser.color, boxShadow: `0 2px 10px ${currentUser.color}60` }}
              />
            </div>
          </div>
        </div>

        {isCompleted && (
          <div className="glass-morphism bg-gradient-to-r from-green-400/20 to-blue-400/20 border border-green-200 px-6 py-4 rounded-2xl mb-6 text-center animate-fadeIn">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-1">🎉 Puzzle Complete!</h2>
            <p className="text-gray-700">Great job! You solved the puzzle together!</p>
          </div>
        )}

        <div
          ref={containerRef}
          className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-inner mx-auto"
          style={{
            width: '1200px',
            height: '800px',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
          }}
          onMouseMove={throttledHandleMouseMove}
        >
          {/* Puzzle area outline */}
          <div
            className="absolute border-2 border-gray-400 rounded-lg"
            style={{
              width: `${session.imageWidth}px`,
              height: `${session.imageHeight}px`,
              left: '50px',
              top: '50px',
              borderStyle: 'dashed',
              opacity: 0.5,
            }}
          />

          {/* Puzzle pieces */}
          {session.pieces.map((piece) => (
            <PuzzlePiece
              key={piece.id}
              piece={piece}
              containerOffset={containerOffset}
              onMove={handlePieceMove}
              onLock={handlePieceLock}
              onUnlock={handlePieceUnlock}
              onRelease={handlePieceRelease}
              isLocked={(piece.lockedBy !== null && piece.lockedBy !== currentUser.id) || isCompleted}
            />
          ))}

          {/* User cursors */}
          {Object.values(session.users).map((user) => {
            if (user.id === currentUser.id) return null
            return <UserCursor key={user.id} user={user} />
          })}
        </div>

        {/* Thumbnail of complete image */}
        <div 
          className="fixed bottom-6 left-6 glass-morphism rounded-2xl shadow-xl p-3 card-hover animate-fadeIn"
          style={{ zIndex: 50 }}
        >
          <img 
            src={session.imageUrl} 
            alt="Complete puzzle"
            className="rounded-xl shadow-md"
            style={{
              width: '150px',
              height: 'auto',
              maxHeight: '150px',
              objectFit: 'contain'
            }}
          />
          <p className="text-xs text-gray-600 text-center mt-2 font-medium">Reference Image</p>
        </div>

        {/* Scoreboard Modal */}
        {showScoreboard && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className="relative animate-fadeIn" style={{ animationDelay: '0.1s' }}>
              <Scoreboard session={session} />
              <button
                onClick={() => setShowScoreboard(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors bg-white/80 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:shadow-lg"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PuzzleGame