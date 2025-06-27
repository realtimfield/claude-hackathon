import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User } from '../types/types'

interface UserState {
  currentUser: User | null
  sessionId: string | null
}

const initialState: UserState = {
  currentUser: null,
  sessionId: null,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload
    },
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload
    },
    clearUser: (state) => {
      state.currentUser = null
      state.sessionId = null
    },
  },
})

export const { setCurrentUser, setSessionId, clearUser } = userSlice.actions

export default userSlice.reducer