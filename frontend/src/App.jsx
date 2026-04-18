import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import QuizEditorPage from './pages/QuizEditorPage'
import HostSessionPage from './pages/HostSessionPage'
import JoinPage from './pages/JoinPage'
import PlayPage from './pages/PlayPage'
import ResultsPage from './pages/ResultsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-navy-300 font-body">Loading PeersQ...</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route path="/play/:sessionCode" element={<PlayPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/quiz/new" element={<ProtectedRoute><QuizEditorPage /></ProtectedRoute>} />
          <Route path="/quiz/:id/edit" element={<ProtectedRoute><QuizEditorPage /></ProtectedRoute>} />
          <Route path="/host/:sessionCode" element={<ProtectedRoute><HostSessionPage /></ProtectedRoute>} />
          <Route path="/results/:sessionId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  )
}
