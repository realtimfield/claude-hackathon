import React from 'react'
import { User } from '../types/types'

interface UserCursorProps {
  user: User
}

const UserCursor: React.FC<UserCursorProps> = ({ user }) => {
  return (
    <div
      className="user-cursor"
      style={{
        left: `${user.cursorX}px`,
        top: `${user.cursorY}px`,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L4 20h7l-1 4 9-12h-7l1-10z"
          fill={user.color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <div
        className="absolute top-6 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
        style={{ color: 'white' }}
      >
        {user.name}
      </div>
    </div>
  )
}

export default UserCursor