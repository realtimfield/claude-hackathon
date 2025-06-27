import { Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import PuzzleGame from './components/PuzzleGame'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/puzzle/:sessionId" element={<PuzzleGame />} />
      </Routes>
    </div>
  )
}

export default App