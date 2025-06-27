import { Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import PuzzleGame from './components/PuzzleGame'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/puzzle/:sessionId" element={<PuzzleGame />} />
    </Routes>
  )
}

export default App