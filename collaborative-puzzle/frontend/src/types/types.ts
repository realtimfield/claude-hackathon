export interface User {
  id: string
  name: string
  color: string
  cursorX: number
  cursorY: number
}

export interface PuzzlePiece {
  id: number
  row: number
  col: number
  currentX: number
  currentY: number
  correctX: number
  correctY: number
  width: number
  height: number
  imageUrl: string
  isPlaced: boolean
  lockedBy: string | null
}

export interface PuzzleSession {
  id: string
  imageUrl: string
  gridSize: number
  totalPieces: number
  pieces: PuzzlePiece[]
  users: Record<string, User>
  createdAt: string
  completed: boolean
  imageWidth: number
  imageHeight: number
}

export interface WebSocketMessage {
  type: MessageType
  data: Record<string, any>
}

export enum MessageType {
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  PIECE_MOVE = 'PIECE_MOVE',
  PIECE_LOCK = 'PIECE_LOCK',
  PIECE_UNLOCK = 'PIECE_UNLOCK',
  PIECE_RELEASE = 'PIECE_RELEASE',
  PIECE_PLACED = 'PIECE_PLACED',
  CURSOR_MOVE = 'CURSOR_MOVE',
  PUZZLE_COMPLETE = 'PUZZLE_COMPLETE',
  SESSION_STATE = 'SESSION_STATE'
}