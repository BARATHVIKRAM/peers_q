import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Users, Clock, Target } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function ResultsPage() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/session/${sessionId}/results`)
      .then(r => setSession(r.data.session))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-white mb-4">Session not found</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    </div>
  )

  const sorted = [...session.participants].sort((a, b) => b.score - a.score)
  const duration = session.endedAt && session.startedAt
    ? Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 60000)
    : null

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard" className="text-navy-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">{session.quizId?.title}</h1>
            <p className="text-navy-400 text-sm mt-0.5">
              {new Date(session.createdAt).toLocaleDateString()} · Code: <span className="font-mono text-electric-blue">{session.code}</span>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: Users, label: 'Players', value: session.participants.length, color: 'text-electric-blue' },
            { icon: Target, label: 'Questions', value: session.quizId?.questions?.length || 0, color: 'text-electric-cyan' },
            { icon: Trophy, label: 'Top Score', value: sorted[0]?.score?.toLocaleString() || 0, color: 'text-accent-gold' },
            { icon: Clock, label: 'Duration', value: duration ? `${duration}m` : 'N/A', color: 'text-accent-mint' }
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card text-center">
              <Icon size={24} className={`${color} mx-auto mb-2`} />
              <p className="font-mono font-bold text-2xl text-white">{value}</p>
              <p className="text-navy-400 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <h2 className="font-display font-bold text-xl text-white mb-4">Final Leaderboard</h2>
        <div className="space-y-2">
          {sorted.map((p, i) => (
            <div key={p._id} className={`leaderboard-item rank-${i + 1}`}>
              <span className={`w-8 text-center font-bold ${
                i === 0 ? 'text-accent-gold text-xl' : i === 1 ? 'text-gray-300 text-xl' : i === 2 ? 'text-amber-600 text-xl' : 'text-navy-400'
              }`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="text-2xl">{p.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{p.name}</p>
                <p className="text-xs text-navy-400">
                  {p.answers.filter(a => a.isCorrect).length}/{p.answers.length} correct
                  {p.streak > 2 && ` · 🔥 ${p.streak} streak`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-white">{p.score.toLocaleString()}</p>
                <p className="text-xs text-navy-400">pts</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
