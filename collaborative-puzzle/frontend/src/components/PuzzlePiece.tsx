import React, { useRef, useState, useEffect } from 'react'
import { PuzzlePiece as PuzzlePieceType } from '../types/types'

interface PuzzlePieceProps {
  piece: PuzzlePieceType
  containerOffset: { x: number; y: number }
  onMove: (pieceId: number, x: number, y: number) => void
  onLock: (pieceId: number) => void
  onUnlock: (pieceId: number) => void
  onRelease: (pieceId: number, x: number, y: number) => void
  isLocked: boolean
}

const PuzzlePiece: React.FC<PuzzlePieceProps> = ({
  piece,
  containerOffset,
  onMove,
  onLock,
  onUnlock,
  onRelease,
  isLocked,
}) => {
  const pieceRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [currentPosition, setCurrentPosition] = useState({ x: piece.currentX, y: piece.currentY })

  useEffect(() => {
    setCurrentPosition({ x: piece.currentX, y: piece.currentY })
  }, [piece.currentX, piece.currentY])

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        let newX = e.clientX - containerOffset.x - dragOffset.x
        let newY = e.clientY - containerOffset.y - dragOffset.y
        
        // Constrain piece within container bounds
        newX = Math.max(0, Math.min(newX, 1200 - piece.width))
        newY = Math.max(0, Math.min(newY, 800 - piece.height))
        
        setCurrentPosition({ x: newX, y: newY })
        onMove(piece.id, newX, newY)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
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
  }, [isDragging, dragOffset, piece.id, piece.width, piece.height, currentPosition, containerOffset, onMove, onUnlock, onRelease])

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

  const pieceStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${piece.currentX}px`,
    top: `${piece.currentY}px`,
    width: `${piece.width}px`,
    height: `${piece.height}px`,
    backgroundImage: `url(${piece.imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    cursor: isLocked ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 1000 : 10,
    opacity: 1,
    transition: 'none',
  }

  return (
    <div
      ref={pieceRef}
      className={`puzzle-piece ${piece.isPlaced ? 'placed' : ''} ${isLocked ? 'locked' : ''}`}
      style={pieceStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-0 border border-gray-400 pointer-events-none" />
    </div>
  )
}

export default PuzzlePiece