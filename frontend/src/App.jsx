import { Navigate, Route, Routes } from 'react-router-dom'
import ProfLogin from './pages/ProfLogin'
import ProfDashboard from './pages/ProfDashboard'
import CreateAssignment from './pages/CreateAssignment'
import StudentLanding from './pages/StudentLanding'
import DefenseSession from './pages/DefenseSession'
import ScoreScreen from './pages/ScoreScreen'
import AITutor from './pages/AITutor'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<ProfLogin />} />
      <Route path="/dashboard" element={<ProfDashboard />} />
      <Route path="/assignments/new" element={<CreateAssignment />} />
      <Route path="/submit/:token" element={<StudentLanding />} />
      <Route path="/defense/:sessionId" element={<DefenseSession />} />
      <Route path="/score/:reportId" element={<ScoreScreen />} />
      <Route path="/tutor/:reportId" element={<AITutor />} />
    </Routes>
  )
}
