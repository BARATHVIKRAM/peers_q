import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Users, Clock, Target, Download } from 'lucide-react'
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
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="w-10 h-10 border-3 rounded-full animate-spin"
        style={{ borderColor: 'var(--paper)', borderTopColor: 'var(--blue-vivid)', borderWidth: 3 }} />
    </div>
  )

  if (!session) return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center surface p-10">
        <p className="text-[var(--ink)] mb-4 font-medium">Session not found</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    </div>
  )

  const sorted = [...session.participants].sort((a, b) => b.score - a.score)
  const duration = session.endedAt && session.startedAt
    ? Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 60000)
    : null

  const rankEmoji = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

  return (
    <div className="min-h-screen page-bg">
      <div className="fixed top-0 right-0 w-[300px] h-[300px] pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(0,87,255,0.12) 0%, transparent 60%)' }} />

      <div className="max-w-3xl mx-auto px-6 py-8 relative z-10">
        {/* Back + title */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard" className="btn-ghost p-2.5">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-display font-bold text-2xl text-[var(--ink)]">{session.quizId?.title}</h1>
            <p className="text-[var(--slate)] text-sm mt-0.5">
              {new Date(session.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
              {' · '}
              <span className="font-mono font-bold" style={{ color: 'var(--blue-vivid)' }}>{session.code}</span>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: Users, label: 'Players', value: session.participants.length, color: 'var(--blue-vivid)' },
            { icon: Target, label: 'Questions', value: session.quizId?.questions?.length || '—', color: '#8B5CF6' },
            { icon: Trophy, label: 'Top Score', value: sorted[0]?.score?.toLocaleString() || '0', color: 'var(--accent-gold)' },
            { icon: Clock, label: 'Duration', value: duration ? `${duration}m` : '—', color: 'var(--accent-green)' }
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="surface p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${color}15` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <p className="font-mono font-bold text-2xl text-[var(--ink)]">{value}</p>
              <p className="text-xs font-medium text-[var(--slate)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Winner highlight */}
        {sorted[0] && (
          <div className="surface p-6 mb-5 text-center"
            style={{ background: 'linear-gradient(135deg,#FFFBEB,#FFFFFF)', border: '2px solid rgba(255,184,0,0.3)' }}>
            <div className="text-5xl mb-2 anim-float">{sorted[0].avatar}</div>
            <div className="chip chip-gold mb-2 mx-auto inline-flex">🏆 WINNER</div>
            <h3 className="font-display font-bold text-2xl text-[var(--ink)]">{sorted[0].name}</h3>
            <p className="font-mono font-bold text-3xl mt-1" style={{ color: 'var(--accent-gold)' }}>
              {sorted[0].score.toLocaleString()} pts
            </p>
            <p className="text-sm text-[var(--slate)] mt-1">
              {sorted[0].answers?.filter(a => a.isCorrect).length || 0}/{sorted[0].answers?.length || 0} correct answers
            </p>
          </div>
        )}

        {/* Full leaderboard */}
        <h2 className="font-display font-bold text-xl text-[var(--ink)] mb-4">Full Leaderboard</h2>
        <div className="space-y-2">
          {sorted.map((p, i) => (
            <div key={p._id}
              className={`lb-item rank-${i + 1} anim-fade-up`}
              style={{ animationDelay: `${i * 0.04}s` }}>
              <span className="font-bold text-xl w-10 text-center flex-shrink-0"
                style={{
                  color: i === 0 ? 'var(--accent-gold)'
                    : i === 1 ? '#94A3B8'
                    : i === 2 ? '#CD7F32'
                    : 'var(--slate)'
                }}>
                {rankEmoji(i)}
              </span>
              <span className="text-2xl flex-shrink-0">{p.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--ink)] truncate">{p.name}</p>
                <p className="text-xs text-[var(--slate)]">
                  {p.answers?.filter(a => a.isCorrect).length || 0}/{p.answers?.length || 0} correct
                  {(p.streak || 0) > 1 && ` · 🔥 ${p.streak} streak`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-bold text-[var(--ink)]">{p.score.toLocaleString()}</p>
                <p className="text-xs text-[var(--slate)]">pts</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
