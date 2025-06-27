import React, { useRef, useState, useEffect, useCallback } from 'react'
import { PuzzlePiece as PuzzlePieceType } from '../types/types'

interface PuzzlePieceProps {
  piece: PuzzlePieceType
  containerOffset: { x: number; y: number }
  onMove: (pieceId: number, x: number, y: number) => void
  onLock: (pieceId: number) => void
  onUnlock: (pieceId: number) => void
  onRelease: (pieceId: number, x: number, y: number) => void
  onHover: () => void
  onHoverEnd: () => void
  isLocked: boolean
}

const PuzzlePiece: React.FC<PuzzlePieceProps> = ({
  piece,
  containerOffset,
  onMove,
  onLock,
  onUnlock,
  onRelease,
  onHover,
  onHoverEnd,
  isLocked,
}) => {
  const pieceRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [currentPosition, setCurrentPosition] = useState({ x: piece.currentX, y: piece.currentY })
  const [isSnapping, setIsSnapping] = useState(false)
  const [displayRotation, setDisplayRotation] = useState(piece.rotation || 0)
  const lastUpdateRef = useRef<number>(0)
  const pendingUpdateRef = useRef<{ x: number; y: number } | null>(null)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Only update local position from Redux when not dragging
    if (!isDragging) {
      // Check if this is a snap movement (significant position change)
      const dx = Math.abs(piece.currentX - currentPosition.x)
      const dy = Math.abs(piece.currentY - currentPosition.y)
      
      // If position changed significantly, it's likely a snap
      if (dx > 5 || dy > 5) {
        setIsSnapping(true)
        setTimeout(() => setIsSnapping(false), 300) // Match transition duration
      }
      
      setCurrentPosition({ x: piece.currentX, y: piece.currentY })
    }
  }, [piece.currentX, piece.currentY, isDragging])

  // Handle rotation changes to avoid backwards animation
  useEffect(() => {
    setDisplayRotation((prevRotation) => {
      const targetRotation = piece.rotation || 0
      const currentRotation = prevRotation % 360
      
      // Normalize current rotation to 0-359 range
      const normalizedCurrent = currentRotation < 0 ? currentRotation + 360 : currentRotation
      
      // Calculate the difference
      let diff = targetRotation - normalizedCurrent
      
      // Determine shortest path
      if (diff > 180) {
        diff = diff - 360
      } else if (diff < -180) {
        diff = diff + 360
      }
      
      // Apply the rotation by adding the difference
      return prevRotation + diff
    })
  }, [piece.rotation])

  // Throttled move function that only sends updates every 100ms
  const throttledMove = useCallback((pieceId: number, x: number, y: number) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateRef.current

    if (timeSinceLastUpdate >= 50) {
      // Enough time has passed, send update immediately
      onMove(pieceId, x, y)
      lastUpdateRef.current = now
      pendingUpdateRef.current = null
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
        updateTimerRef.current = null
      }
    } else {
      // Too soon, schedule update
      pendingUpdateRef.current = { x, y }
      
      if (!updateTimerRef.current) {
        const delay = 50 - timeSinceLastUpdate
        updateTimerRef.current = setTimeout(() => {
          if (pendingUpdateRef.current) {
            onMove(pieceId, pendingUpdateRef.current.x, pendingUpdateRef.current.y)
            lastUpdateRef.current = Date.now()
            pendingUpdateRef.current = null
          }
          updateTimerRef.current = null
        }, delay)
      }
    }
  }, [onMove])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        let newX = e.clientX - containerOffset.x - dragOffset.x
        let newY = e.clientY - containerOffset.y - dragOffset.y
        
        // Constrain piece within container bounds
        newX = Math.max(0, Math.min(newX, 1200 - piece.width))
        newY = Math.max(0, Math.min(newY, 800 - piece.height))
        
        setCurrentPosition({ x: newX, y: newY })
        throttledMove(piece.id, newX, newY)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        
        // Clear any pending throttled updates
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current)
          updateTimerRef.current = null
        }
        
        // Send final position if there's a pending update
        if (pendingUpdateRef.current) {
          onMove(piece.id, pendingUpdateRef.current.x, pendingUpdateRef.current.y)
          pendingUpdateRef.current = null
        }
        
        onRelease(piece.id, currentPosition.x, currentPosition.y)
        onUnlock(piece.id)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset, piece.id, piece.width, piece.height, currentPosition, containerOffset, throttledMove, onUnlock, onRelease])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return

    e.preventDefault()
    // Calculate offset from mouse position to piece position
    const mouseX = e.clientX - containerOffset.x
    const mouseY = e.clientY - containerOffset.y
    
    setDragOffset({
      x: mouseX - piece.currentX,
      y: mouseY - piece.currentY,
    })
    
    setIsDragging(true)
    onLock(piece.id)
  }

  // Use local position when dragging for immediate feedback
  const displayX = isDragging ? currentPosition.x : piece.currentX
  const displayY = isDragging ? currentPosition.y : piece.currentY

  const pieceStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${displayX}px`,
    top: `${displayY}px`,
    width: `${piece.width}px`,
    height: `${piece.height}px`,
    backgroundImage: `url(${piece.imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    cursor: isLocked ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 1000 : 10,
    opacity: 1,
    transition: isSnapping ? 'left 0.3s ease, top 0.3s ease, transform 0.2s ease' : 'transform 0.2s ease',
    transform: `rotate(${displayRotation}deg)`,
    transformOrigin: 'center',
  }

  return (
    <div
      ref={pieceRef}
      className={`puzzle-piece ${piece.isPlaced ? 'placed' : ''} ${isLocked ? 'locked' : ''}`}
      style={pieceStyle}
      onMouseDown={handleMouseDown}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
    >
      <div className="absolute inset-0 border border-gray-300 rounded-md pointer-events-none" />
    </div>
  )
}

export default PuzzlePiece