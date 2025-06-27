import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import {
  clearSession,
  setSession,
  updatePiece,
  placePiece,
  lockPiece,
  unlockPiece,
  addUser,
  removeUser,
  updateUserCursor,
  rotatePiece,
  setPuzzleComplete,
  setLoading,
  setError,
} from '../features/puzzleSlice'
import { setCurrentUser, setSessionId } from '../features/userSlice'
import { MessageType, WebSocketMessage } from '../types/types'
import axios from '../config/axios'
import PuzzlePiece from './PuzzlePiece'
import UserCursor from './UserCursor'
import JoinSession from './JoinSession'
import Scoreboard from './Scoreboard'
import ImageModal from './ImageModal'
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
  const [showImageModal, setShowImageModal] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [hoveredPieceId, setHoveredPieceId] = useState<number | null>(null)
  const [draggingPieceId, setDraggingPieceId] = useState<number | null>(null)

  useEffect(() => {
    if (!sessionId) return

    // Check if we're navigating to a different session
    if (session && session.id !== sessionId) {
      // Clear the current session state before loading the new one
      dispatch(clearSession())
      // Close existing WebSocket connection
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }

    const userId = localStorage.getItem('userId')
    const userName = localStorage.getItem('userName')
    
    if (!userId || !userName) {
      setNeedsToJoin(true)
      return
    }

    // Reset needsToJoin if we have credentials
    setNeedsToJoin(false)
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

  // Handle keyboard events for rotation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!session || !currentUser || isCompleted) return

      const key = e.key.toLowerCase()
      if (key !== 'q' && key !== 'e') return

      // Determine which piece to rotate
      let pieceIdToRotate: number | null = null
      
      if (draggingPieceId !== null) {
        // If dragging a piece, rotate that piece
        pieceIdToRotate = draggingPieceId
      } else if (hoveredPieceId !== null) {
        // If hovering over a piece, rotate that piece
        pieceIdToRotate = hoveredPieceId
      }

      if (pieceIdToRotate !== null) {
        // Check if the piece is not locked by another user
        const piece = session.pieces.find(p => p.id === pieceIdToRotate)
        if (piece && (!piece.lockedBy || piece.lockedBy === currentUser.id)) {
          const direction = key === 'q' ? -1 : 1
          sendMessage(MessageType.PIECE_ROTATE, { pieceId: pieceIdToRotate, direction })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session, currentUser, isCompleted, draggingPieceId, hoveredPieceId])

  const loadSession = async () => {
    try {
      dispatch(setLoading(true))
      const response = await axios.get(`/api/sessions/${sessionId}`)
      dispatch(setSession(response.data))
      
      const userId = localStorage.getItem('userId')!
      
      // Check if user exists in the session
      const existingUser = response.data.users[userId]
      if (existingUser) {
        // User is already in the session, just reconnect
        dispatch(setCurrentUser(existingUser))
        connectWebSocket(userId)
      } else {
        // User is not in the session, need to join
        setNeedsToJoin(true)
      }
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
          userId: message.data.userId,
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
        
      case MessageType.PIECE_ROTATE:
        dispatch(rotatePiece({
          pieceId: message.data.pieceId,
          rotation: message.data.rotation,
          isPlaced: message.data.isPlaced,
          placedBy: message.data.placedBy,
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
    setDraggingPieceId(pieceId)
  }

  const handlePieceUnlock = (pieceId: number) => {
    sendMessage(MessageType.PIECE_UNLOCK, { pieceId })
    setDraggingPieceId(null)
  }

  const handlePieceRelease = (pieceId: number, x: number, y: number) => {
    sendMessage(MessageType.PIECE_RELEASE, { pieceId, x, y })
    setDraggingPieceId(null)
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/puzzle/${sessionId}`
    navigator.clipboard.writeText(link).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }).catch(err => {
      console.error('Failed to copy link:', err)
    })
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
                <span className="font-medium">Session:</span> 
                <code 
                  className="bg-gray-100 px-2 py-1 rounded text-sm cursor-pointer hover:bg-gray-200 transition-colors relative group"
                  onClick={handleCopyLink}
                  title="Click to copy join link"
                >
                  {sessionId?.slice(0, 8)}...
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Click to copy link
                  </span>
                </code>
                {copyFeedback && (
                  <span className="ml-2 text-green-600 text-sm animate-fadeIn">
                    ✓ Copied!
                  </span>
                )}
                <span className="font-medium ml-2">|</span>
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
              onHover={() => setHoveredPieceId(piece.id)}
              onHoverEnd={() => setHoveredPieceId(null)}
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
          className="fixed bottom-6 left-6 glass-morphism rounded-2xl shadow-xl p-3 card-hover animate-fadeIn cursor-pointer transform transition-transform hover:scale-105"
          style={{ zIndex: 50 }}
          onClick={() => setShowImageModal(true)}
          title="Click to enlarge"
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
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-2xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
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

        {/* Image Modal */}
        <ImageModal
          imageUrl={session.imageUrl}
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
        />
        
        {/* GitHub Link */}
        <a
          href="https://github.com/realtimfield/claude-hackathon"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 glass-morphism rounded-full p-3 shadow-lg hover:shadow-xl transition-all hover:scale-110"
          title="View on GitHub"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
        </a>
      </div>
    </div>
  )
}

export default PuzzleGame