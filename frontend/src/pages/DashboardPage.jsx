import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Play, Edit2, Trash2, Zap, LogOut, BarChart2, BookOpen } from 'lucide-react'
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
    Promise.all([
      api.get('/quiz'),
      api.get('/session')
    ]).then(([qRes, sRes]) => {
      setQuizzes(qRes.data.quizzes)
      setSessions(sRes.data.sessions)
    }).catch(err => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const deleteQuiz = async (id) => {
    if (!confirm('Delete this quiz?')) return
    try {
      await api.delete(`/quiz/${id}`)
      setQuizzes(q => q.filter(x => x._id !== id))
      toast.success('Quiz deleted')
    } catch {
      toast.error('Failed to delete quiz')
    }
  }

  const launchSession = async (quizId) => {
    setLaunching(quizId)
    try {
      const { data } = await api.post('/session/create', { quizId })
      navigate(`/host/${data.session.code}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to launch session')
    } finally {
      setLaunching(null)
    }
  }

  return (
    <div className="min-h-screen grid-bg">
      {/* Nav */}
      <nav className="glass-strong border-b border-navy-700/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-electric-blue rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-navy-950" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-lg">PeersQ</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-navy-300 text-sm hidden sm:block">Hey, <span className="text-white font-medium">{user?.name}</span></span>
            <button onClick={logout} className="text-navy-400 hover:text-white transition-colors p-2">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl text-white">My Quizzes</h1>
            <p className="text-navy-300 mt-1">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} created</p>
          </div>
          <Link to="/quiz/new" className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            New Quiz
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="card animate-pulse h-48">
                <div className="h-4 bg-navy-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-navy-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-navy-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={32} className="text-navy-500" />
            </div>
            <h3 className="font-display font-semibold text-xl text-white mb-2">No quizzes yet</h3>
            <p className="text-navy-300 mb-6">Create your first quiz or upload a document to generate one with AI</p>
            <Link to="/quiz/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={18} /> Create Quiz
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map(quiz => (
              <div key={quiz._id} className="card group hover:border-electric-blue/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-white truncate mb-1">{quiz.title}</h3>
                    <p className="text-navy-300 text-sm line-clamp-2">{quiz.description || 'No description'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-navy-400 mb-5">
                  <span className="flex items-center gap-1">
                    <BarChart2 size={12} />
                    {quiz.totalPlays || 0} plays
                  </span>
                  <span>•</span>
                  <span>{new Date(quiz.updatedAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => launchSession(quiz._id)}
                    disabled={launching === quiz._id}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50"
                  >
                    {launching === quiz._id
                      ? <div className="w-4 h-4 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                      : <><Play size={15} /> Launch</>
                    }
                  </button>
                  <Link to={`/quiz/${quiz._id}/edit`}
                    className="p-2.5 glass rounded-xl text-navy-300 hover:text-white hover:border-navy-500 transition-all">
                    <Edit2 size={15} />
                  </Link>
                  <button onClick={() => deleteQuiz(quiz._id)}
                    className="p-2.5 glass rounded-xl text-navy-300 hover:text-accent-coral hover:border-accent-coral/30 transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display font-bold text-xl text-white mb-4">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(s => (
                <div key={s._id} className="card flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${s.status === 'finished' ? 'bg-navy-500' : 'bg-green-400 animate-pulse'}`} />
                    <span className="font-medium text-white">{s.quizId?.title}</span>
                    <span className="font-mono text-electric-blue text-sm">{s.code}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-navy-400 text-sm">{s.participants?.length || 0} players</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      s.status === 'finished' ? 'bg-navy-700 text-navy-300' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {s.status}
                    </span>
                    {s.status === 'finished' && (
                      <Link to={`/results/${s._id}`} className="text-electric-blue hover:text-electric-cyan text-sm transition-colors">
                        Results →
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
