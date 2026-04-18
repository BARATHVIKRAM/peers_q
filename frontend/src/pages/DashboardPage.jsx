import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Play, Edit2, Trash2, Zap, LogOut, BarChart2, BookOpen, Clock, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([api.get('/quiz'), api.get('/session')])
      .then(([qRes, sRes]) => {
        setQuizzes(qRes.data.quizzes)
        setSessions(sRes.data.sessions)
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const deleteQuiz = async (id) => {
    if (!confirm('Delete this quiz? This cannot be undone.')) return
    try {
      await api.delete(`/quiz/${id}`)
      setQuizzes(q => q.filter(x => x._id !== id))
      toast.success('Quiz deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const launchSession = async (quizId) => {
    setLaunching(quizId)
    try {
      const { data } = await api.post('/session/create', { quizId })
      navigate(`/host/${data.session.code}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to launch')
    } finally {
      setLaunching(null)
    }
  }

  const totalPlays = quizzes.reduce((s, q) => s + (q.totalPlays || 0), 0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--off-white)' }}>
      {/* Fixed bg decoration */}
      <div className="fixed top-0 right-0 w-[400px] h-[400px] pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(0,87,255,0.08) 0%, transparent 60%)' }} />

      {/* Nav */}
      <nav className="nav-bar">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg,#0057FF,#003ABF)' }}>
              <Zap size={17} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-lg text-[var(--ink)]">PeersQ</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: 'var(--paper)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#0057FF,#003ABF)' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-[var(--ink)]">{user?.name}</span>
            </div>
            <button onClick={logout}
              className="btn-ghost text-sm px-3 py-2 text-[var(--slate)]">
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Quizzes Created', value: quizzes.length, icon: BookOpen, color: 'var(--blue-vivid)' },
            { label: 'Total Sessions', value: sessions.length, icon: Play, color: 'var(--accent-green)' },
            { label: 'Total Plays', value: totalPlays, icon: Users2, color: '#8B5CF6' },
            { label: 'Questions Built', value: quizzes.reduce((s, q) => s + (q.questionCount || 0), 0) || '—', icon: BarChart2, color: 'var(--accent-gold)' }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="surface p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[var(--slate)] uppercase tracking-wider">{label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}15` }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <p className="font-display font-bold text-3xl text-[var(--ink)]">{value}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-bold text-2xl text-[var(--ink)]">My Quizzes</h1>
          <Link to="/quiz/new" className="btn-primary gap-2 py-2.5 px-5 text-sm">
            <Plus size={17} /> New Quiz
          </Link>
        </div>

        {/* Quiz grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="surface p-6 h-48">
                <div className="h-4 rounded-xl mb-3" style={{ background: 'var(--paper)', width: '70%' }} />
                <div className="h-3 rounded-xl mb-2" style={{ background: 'var(--paper)', width: '50%' }} />
                <div className="h-3 rounded-xl" style={{ background: 'var(--paper)', width: '40%' }} />
              </div>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="surface text-center py-20 px-8">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--paper)' }}>
              <BookOpen size={32} style={{ color: 'var(--slate-light)' }} />
            </div>
            <h3 className="font-display font-bold text-xl text-[var(--ink)] mb-2">No quizzes yet</h3>
            <p className="text-[var(--slate)] mb-8 max-w-sm mx-auto">
              Create your first quiz manually, or upload a PDF and let AI build it for you in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/quiz/new" className="btn-primary gap-2">
                <Plus size={17} /> Create Manually
              </Link>
              <Link to="/quiz/new" className="btn-secondary gap-2">
                <Sparkles size={17} /> Generate with AI
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz, i) => (
              <div key={quiz._id}
                className={`surface p-6 group hover:shadow-card-hover transition-all duration-300 anim-fade-up d${Math.min(i+1,8)}`}
                style={{ ':hover': { transform: 'translateY(-4px)' } }}>
                {/* Category pill */}
                <div className="flex items-center justify-between mb-4">
                  <span className="chip chip-blue text-xs">
                    {quiz.category || 'General'}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--slate)]">
                    <BarChart2 size={12} />
                    {quiz.totalPlays || 0} plays
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg text-[var(--ink)] mb-1 line-clamp-2 leading-tight">
                  {quiz.title}
                </h3>
                <p className="text-sm text-[var(--slate)] line-clamp-2 mb-4 leading-relaxed">
                  {quiz.description || 'No description'}
                </p>

                <div className="flex items-center gap-1 text-xs text-[var(--slate-light)] mb-5">
                  <Clock size={11} />
                  <span>{new Date(quiz.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => launchSession(quiz._id)}
                    disabled={launching === quiz._id}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50">
                    {launching === quiz._id
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Play size={14} fill="white" /> Launch</>
                    }
                  </button>
                  <Link to={`/quiz/${quiz._id}/edit`}
                    className="btn-secondary p-2.5 text-sm">
                    <Edit2 size={15} />
                  </Link>
                  <button onClick={() => deleteQuiz(quiz._id)}
                    className="p-2.5 rounded-2xl border-2 transition-all text-sm"
                    style={{ border: '2px solid var(--paper)', color: 'var(--slate-light)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-coral)'; e.currentTarget.style.color = 'var(--accent-coral)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--paper)'; e.currentTarget.style.color = 'var(--slate-light)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display font-bold text-xl text-[var(--ink)] mb-4">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(s => (
                <div key={s._id} className="surface flex items-center justify-between p-4 hover:shadow-card transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'finished' ? '' : 'animate-pulse'}`}
                      style={{ background: s.status === 'finished' ? 'var(--slate-light)' : 'var(--accent-green)' }} />
                    <span className="font-medium text-[var(--ink)]">{s.quizId?.title}</span>
                    <span className="font-mono text-sm font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: 'rgba(0,87,255,0.08)', color: 'var(--blue-vivid)' }}>
                      {s.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--slate)]">{s.participants?.length || 0} players</span>
                    <span className={`chip text-xs ${s.status === 'finished' ? 'chip-blue' : 'chip-green'}`}>
                      {s.status}
                    </span>
                    {s.status === 'finished' && (
                      <Link to={`/results/${s._id}`}
                        className="text-sm font-semibold flex items-center gap-1 transition-colors"
                        style={{ color: 'var(--blue-vivid)' }}>
                        Results <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Local icon since lucide doesn't export Users2
function Users2({ size, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8"/>
    </svg>
  )
}
