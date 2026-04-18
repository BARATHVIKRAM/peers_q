import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Zap, Hash } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const AVATARS = ['🦊', '🐺', '🦁', '🐯', '🦝', '🐸', '🦋', '🦄', '🐉', '🦅', '🐬', '🦈', '🦍', '🐙', '🦑', '🦓', '🦒', '🦘', '🦔', '🦦']

export default function JoinPage() {
  const { code: urlCode } = useParams()
  const navigate = useNavigate()
  const [code, setCode] = useState(urlCode || '')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * AVATARS.length)])
  const [step, setStep] = useState(urlCode ? 'name' : 'code')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (urlCode) checkCode(urlCode)
  }, [urlCode])

  const checkCode = async (c) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/session/code/${c.toUpperCase()}`)
      setSession(data.session)
      setStep('name')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Session not found')
      setStep('code')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    if (code.length < 4) return toast.error('Enter a valid code')
    checkCode(code)
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Enter your name')
    navigate(`/play/${code.toUpperCase()}`, {
      state: { name: name.trim(), avatar, sessionInfo: session }
    })
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-electric-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-electric-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-navy-950" fill="currentColor" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white mb-1">Join Quiz</h1>
          <p className="text-navy-300">Enter your session code to play</p>
        </div>

        {step === 'code' ? (
          <div className="card">
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-2">Session Code</label>
                <div className="relative">
                  <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="input-field pl-10 text-center font-mono text-2xl tracking-widest uppercase"
                    placeholder="ABC123"
                    maxLength={6}
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading
                  ? <div className="w-5 h-5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                  : 'Find Session'
                }
              </button>
            </form>
          </div>
        ) : (
          <div className="card">
            {session && (
              <div className="mb-5 p-3 bg-electric-blue/10 border border-electric-blue/20 rounded-xl text-center">
                <p className="text-navy-300 text-xs mb-1">Joining quiz</p>
                <p className="text-white font-display font-semibold">{session.quizId?.title || 'Quiz Session'}</p>
                <p className="text-electric-blue text-xs mt-1 font-mono">{code.toUpperCase()}</p>
              </div>
            )}
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-2">Your Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field text-lg"
                  placeholder="Enter your name..."
                  maxLength={30}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-300 mb-2">Pick Avatar</label>
                <div className="grid grid-cols-10 gap-1.5">
                  {AVATARS.map(a => (
                    <button key={a} type="button" onClick={() => setAvatar(a)}
                      className={`text-2xl p-1.5 rounded-xl transition-all hover:scale-110 ${
                        avatar === a ? 'bg-electric-blue/20 border border-electric-blue/50 scale-110' : 'hover:bg-navy-700/50'
                      }`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-base">
                <span className="text-xl">{avatar}</span>
                Join as {name || '...'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
