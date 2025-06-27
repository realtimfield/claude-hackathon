import React, { useRef, useState, useEffect, useCallback } from 'react'
import { PuzzlePiece as PuzzlePieceType, PieceShape } from '../types/types'

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
    cursor: isLocked ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 1000 : 10,
    opacity: 1,
    transition: isSnapping ? 'left 0.3s ease, top 0.3s ease, transform 0.2s ease' : 'transform 0.2s ease',
    transform: `rotate(${displayRotation}deg)`,
    transformOrigin: 'center',
  }

  // Generate jigsaw piece SVG path based on edge types
  const generateJigsawPath = (width: number, height: number, shape?: PieceShape): string => {
    if (!shape) {
      return `M 0,0 L ${width},0 L ${width},${height} L 0,${height} Z`
    }

    const path: string[] = []
    
    // Start at top-left
    path.push(`M 0,0`)
    
    // Top edge
    if (shape.topEdge.type === 'FLAT') {
      path.push(`L ${width},0`)
    } else {
      const isTab = shape.topEdge.type === 'TAB'
      const depth = height * 0.2 * (isTab ? -1 : 1)
      const tabWidth = width * 0.4
      const centerX = width * 0.5
      const startX = centerX - tabWidth * 0.5
      const endX = centerX + tabWidth * 0.5
      
      path.push(`L ${startX},0`)
      path.push(`C ${startX},0 ${startX},${depth * 0.3} ${centerX - tabWidth * 0.25},${depth * 0.8}`)
      path.push(`C ${centerX - tabWidth * 0.1},${depth} ${centerX + tabWidth * 0.1},${depth} ${centerX + tabWidth * 0.25},${depth * 0.8}`)
      path.push(`C ${endX},${depth * 0.3} ${endX},0 ${endX},0`)
      path.push(`L ${width},0`)
    }
    
    // Right edge
    if (shape.rightEdge.type === 'FLAT') {
      path.push(`L ${width},${height}`)
    } else {
      const isTab = shape.rightEdge.type === 'TAB'
      const depth = width * 0.2 * (isTab ? 1 : -1)
      const tabWidth = height * 0.4
      const centerY = height * 0.5
      const startY = centerY - tabWidth * 0.5
      const endY = centerY + tabWidth * 0.5
      
      path.push(`L ${width},${startY}`)
      path.push(`C ${width},${startY} ${width + depth * 0.3},${startY} ${width + depth * 0.8},${centerY - tabWidth * 0.25}`)
      path.push(`C ${width + depth},${centerY - tabWidth * 0.1} ${width + depth},${centerY + tabWidth * 0.1} ${width + depth * 0.8},${centerY + tabWidth * 0.25}`)
      path.push(`C ${width + depth * 0.3},${endY} ${width},${endY} ${width},${endY}`)
      path.push(`L ${width},${height}`)
    }
    
    // Bottom edge
    if (shape.bottomEdge.type === 'FLAT') {
      path.push(`L 0,${height}`)
    } else {
      const isTab = shape.bottomEdge.type === 'TAB'
      const depth = height * 0.2 * (isTab ? 1 : -1)
      const tabWidth = width * 0.4
      const centerX = width * 0.5
      const startX = centerX + tabWidth * 0.5
      const endX = centerX - tabWidth * 0.5
      
      path.push(`L ${startX},${height}`)
      path.push(`C ${startX},${height} ${startX},${height + depth * 0.3} ${centerX + tabWidth * 0.25},${height + depth * 0.8}`)
      path.push(`C ${centerX + tabWidth * 0.1},${height + depth} ${centerX - tabWidth * 0.1},${height + depth} ${centerX - tabWidth * 0.25},${height + depth * 0.8}`)
      path.push(`C ${endX},${height + depth * 0.3} ${endX},${height} ${endX},${height}`)
      path.push(`L 0,${height}`)
    }
    
    // Left edge
    if (shape.leftEdge.type === 'FLAT') {
      path.push(`L 0,0`)
    } else {
      const isTab = shape.leftEdge.type === 'TAB'
      const depth = width * 0.2 * (isTab ? -1 : 1)
      const tabWidth = height * 0.4
      const centerY = height * 0.5
      const startY = centerY + tabWidth * 0.5
      const endY = centerY - tabWidth * 0.5
      
      path.push(`L 0,${startY}`)
      path.push(`C 0,${startY} ${depth * 0.3},${startY} ${depth * 0.8},${centerY + tabWidth * 0.25}`)
      path.push(`C ${depth},${centerY + tabWidth * 0.1} ${depth},${centerY - tabWidth * 0.1} ${depth * 0.8},${centerY - tabWidth * 0.25}`)
      path.push(`C ${depth * 0.3},${endY} 0,${endY} 0,${endY}`)
      path.push(`L 0,0`)
    }
    
    path.push('Z')
    return path.join(' ')
  }


  // Render SVG-based jigsaw piece
  const renderJigsawPiece = () => {
    const jigsawPath = generateJigsawPath(piece.width, piece.height, piece.shape)
    
    // The backend now provides larger images with 25% extension on each side
    const extensionFactor = 0.25
    const totalScale = 1 + (extensionFactor * 2) // 1.5x total size
    const offset = piece.width * extensionFactor
    
    return (
      <svg
        width={piece.width}
        height={piece.height}
        className="absolute top-0 left-0"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <clipPath id={`piece-clip-${piece.id}`}>
            <path d={jigsawPath} />
          </clipPath>
        </defs>
        <image
          href={piece.imageUrl}
          x={-offset}
          y={-offset}
          width={piece.width * totalScale}
          height={piece.height * totalScale}
          clipPath={`url(#piece-clip-${piece.id})`}
          style={{ pointerEvents: 'none' }}
        />
        {/* Show piece outline */}
        <path
          d={jigsawPath}
          fill="none"
          stroke="rgba(0, 0, 0, 0.3)"
          strokeWidth="1"
          style={{ pointerEvents: 'none' }}
        />
      </svg>
    )
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
      {renderJigsawPiece()}
    </div>
  )
}

export default PuzzlePiece