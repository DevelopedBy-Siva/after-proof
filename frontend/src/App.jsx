import { Routes, Route, Navigate } from 'react-router-dom'
import ProfLogin       from './pages/ProfLogin'
import ProfDashboard   from './pages/ProfDashboard'
import CreateAssignment from './pages/CreateAssignment'
import StudentLanding  from './pages/StudentLanding'
import DefenseSession  from './pages/DefenseSession'
import ScoreScreen     from './pages/ScoreScreen'
import AITutor         from './pages/AITutor'

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<Navigate to="/login" />} />
      <Route path="/login"         element={<ProfLogin />} />
      <Route path="/dashboard"     element={<ProfDashboard />} />
      <Route path="/assignments/new" element={<CreateAssignment />} />
      <Route path="/s/:token"      element={<StudentLanding />} />
      <Route path="/defense/:token" element={<DefenseSession />} />
      <Route path="/results/:token" element={<ScoreScreen />} />
      <Route path="/tutor/:token"  element={<AITutor />} />
    </Routes>
  )
}