import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { PuzzleSession, User } from '../types/types'

interface PuzzleState {
  session: PuzzleSession | null
  isLoading: boolean
  error: string | null
  isCompleted: boolean
}

const initialState: PuzzleState = {
  session: null,
  isLoading: false,
  error: null,
  isCompleted: false,
}

const puzzleSlice = createSlice({
  name: 'puzzle',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<PuzzleSession>) => {
      state.session = action.payload
      state.isCompleted = action.payload.completed
    },
    updatePiece: (state, action: PayloadAction<{ pieceId: number; x: number; y: number }>) => {
      if (state.session) {
        const piece = state.session.pieces.find(p => p.id === action.payload.pieceId)
        if (piece) {
          piece.currentX = action.payload.x
          piece.currentY = action.payload.y
        }
      }
    },
    placePiece: (state, action: PayloadAction<{ pieceId: number; x: number; y: number }>) => {
      if (state.session) {
        const piece = state.session.pieces.find(p => p.id === action.payload.pieceId)
        if (piece) {
          piece.currentX = action.payload.x
          piece.currentY = action.payload.y
          piece.isPlaced = true
          piece.lockedBy = null
        }
      }
    },
    lockPiece: (state, action: PayloadAction<{ pieceId: number; userId: string }>) => {
      if (state.session) {
        const piece = state.session.pieces.find(p => p.id === action.payload.pieceId)
        if (piece) {
          piece.lockedBy = action.payload.userId
        }
      }
    },
    unlockPiece: (state, action: PayloadAction<{ pieceId: number }>) => {
      if (state.session) {
        const piece = state.session.pieces.find(p => p.id === action.payload.pieceId)
        if (piece) {
          piece.lockedBy = null
        }
      }
    },
    addUser: (state, action: PayloadAction<User>) => {
      if (state.session) {
        state.session.users[action.payload.id] = action.payload
      }
    },
    removeUser: (state, action: PayloadAction<string>) => {
      if (state.session) {
        delete state.session.users[action.payload]
        // Unlock pieces locked by this user
        state.session.pieces.forEach(piece => {
          if (piece.lockedBy === action.payload) {
            piece.lockedBy = null
          }
        })
      }
    },
    updateUserCursor: (state, action: PayloadAction<{ userId: string; x: number; y: number }>) => {
      if (state.session && state.session.users[action.payload.userId]) {
        state.session.users[action.payload.userId].cursorX = action.payload.x
        state.session.users[action.payload.userId].cursorY = action.payload.y
      }
    },
    rotatePiece: (state, action: PayloadAction<{ pieceId: number; rotation: number }>) => {
      if (state.session) {
        const piece = state.session.pieces.find(p => p.id === action.payload.pieceId)
        if (piece) {
          piece.rotation = action.payload.rotation
        }
      }
    },
    setPuzzleComplete: (state) => {
      state.isCompleted = true
      if (state.session) {
        state.session.completed = true
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const {
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
} = puzzleSlice.actions

export default puzzleSlice.reducer