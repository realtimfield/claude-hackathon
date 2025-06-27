import React, { useEffect, useRef, useState } from 'react'
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

const PuzzleGame: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  
  const { session, isLoading, error, isCompleted } = useSelector((state: RootState) => state.puzzle)
  const { currentUser } = useSelector((state: RootState) => state.user)
  
  const wsRef = useRef<WebSocket | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!sessionId) return

    const userId = localStorage.getItem('userId')
    const userName = localStorage.getItem('userName')
    
    if (!userId || !userName) {
      navigate('/')
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
        break
    }
  }

  const sendMessage = (type: MessageType, data: Record<string, any>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, data }
      wsRef.current.send(JSON.stringify(message))
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    sendMessage(MessageType.CURSOR_MOVE, { x, y })
  }

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading puzzle...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-red-600">{error}</div>
      </div>
    )
  }

  if (!session || !currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left sidebar for players */}
      <div className="w-64 bg-white shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">Players</h3>
        <div className="space-y-2">
          {Object.values(session.users).map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 p-2 bg-gray-100 rounded"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: user.color }}
              />
              <span className="text-sm truncate">
                {user.name}
                {user.id === currentUser.id && ' (You)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Collaborative Puzzle</h1>
              <p className="text-gray-600">
                Session: {sessionId} | Grid: {session.gridSize}x{session.gridSize}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-700 font-semibold">{currentUser.name}</p>
              <span
                className="inline-block w-4 h-4 rounded-full mt-1"
                style={{ backgroundColor: currentUser.color }}
              />
            </div>
          </div>
        </div>

        {isCompleted && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center">
            <h2 className="text-xl font-bold">Puzzle Complete!</h2>
            <p>Great job! You solved the puzzle together!</p>
          </div>
        )}

        <div
          ref={containerRef}
          className="relative bg-gray-200 rounded-lg shadow-inner mx-auto"
          style={{
            width: '1200px',
            height: '800px',
            overflow: 'hidden',
          }}
          onMouseMove={handleMouseMove}
        >
          {/* Puzzle area outline */}
          <div
            className="absolute border-2 border-gray-600"
            style={{
              width: `${session.imageWidth}px`,
              height: `${session.imageHeight}px`,
              left: '50px',
              top: '50px',
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
      </div>
    </div>
  )
}

export default PuzzleGame