import { configureStore } from '@reduxjs/toolkit'
import puzzleReducer from '../features/puzzleSlice'
import userReducer from '../features/userSlice'

export const store = configureStore({
  reducer: {
    puzzle: puzzleReducer,
    user: userReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch