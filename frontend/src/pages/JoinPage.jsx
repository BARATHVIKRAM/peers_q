import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Zap, Hash, ArrowRight } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const AVATARS = [
  '🦊','🐯','🐺','🦁','🐻','🦝','🐸','🦋','🦄','🐉',
  '🦅','🐬','🦈','🦍','🐙','🦑','🦓','🦒','🦘','🦔',
  '🦦','🐳','🦜','🐧','🦩','🌟','⚡','🔥','🌊','🎯'
]

export default function JoinPage() {
  const { code: urlCode } = useParams()
  const navigate = useNavigate()

  const [code, setCode] = useState(urlCode?.toUpperCase() || '')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(() => AVATARS[Math.floor(Math.random() * AVATARS.length)])
  const [step, setStep] = useState(urlCode ? 'name' : 'code')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (urlCode) checkCode(urlCode)
  }, [])

  const checkCode = async (c) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/session/code/${c.toUpperCase()}`)
      setSession(data.session)
      setStep('name')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Session not found or ended')
      setStep('code')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    if (code.length < 4) return toast.error('Enter a valid session code')
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
    <div className="min-h-screen page-bg flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(0,87,255,0.15) 0%, transparent 60%)' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 anim-fade-up">
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-6">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-blue-md transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg,#0057FF,#003ABF)' }}>
              <Zap size={22} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-2xl text-[var(--ink)]">PeersQ</span>
          </Link>
          <h1 className="font-display font-bold text-3xl text-[var(--ink)] mb-1">Join Quiz</h1>
          <p className="text-[var(--slate)] text-sm">Enter a code or scan a QR to participate live</p>
        </div>

        {/* Step: Code entry */}
        {step === 'code' && (
          <div className="surface p-8 anim-scale-in">
            <form onSubmit={handleCodeSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--ink)] mb-2">Session Code</label>
                <div className="relative">
                  <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--slate-light)' }} />
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    className="input-field pl-11 text-center font-mono text-3xl font-bold tracking-widest uppercase"
                    placeholder="ABC123"
                    maxLength={6}
                    autoFocus
                    style={{ letterSpacing: '0.2em' }}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading || code.length < 4}
                className="btn-primary w-full py-4 text-base gap-2 disabled:opacity-50">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Find Session</span><ArrowRight size={18} /></>
                }
              </button>
            </form>
          </div>
        )}

        {/* Step: Name + avatar */}
        {step === 'name' && (
          <div className="surface p-8 anim-scale-in">
            {session && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl mb-5"
                style={{ background: 'rgba(0,87,255,0.06)', border: '1px solid rgba(0,87,255,0.12)' }}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{ background: 'var(--accent-green)' }} />
                <div>
                  <p className="text-xs text-[var(--slate)]">Joining quiz</p>
                  <p className="font-semibold text-sm text-[var(--ink)]">{session.quizId?.title || 'Live Session'}</p>
                </div>
                <span className="ml-auto font-mono font-bold text-sm px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(0,87,255,0.1)', color: 'var(--blue-vivid)' }}>
                  {code}
                </span>
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--ink)] mb-2">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field text-base"
                  placeholder="How should we call you?"
                  maxLength={30}
                  autoFocus
                />
                <p className="text-xs text-[var(--slate-light)] mt-1.5">
                  Leave blank to get a randomly assigned name
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--ink)] mb-3">Choose Avatar</label>
                <div className="grid grid-cols-10 gap-1.5 p-3 rounded-2xl" style={{ background: 'var(--off-white)' }}>
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      className="flex items-center justify-center text-xl rounded-xl transition-all hover:scale-125 aspect-square"
                      style={{
                        background: avatar === a ? 'white' : 'transparent',
                        boxShadow: avatar === a ? '0 2px 10px rgba(0,87,255,0.2)' : 'none',
                        border: avatar === a ? '2px solid rgba(0,87,255,0.3)' : '2px solid transparent',
                        transform: avatar === a ? 'scale(1.2)' : 'scale(1)'
                      }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-4 text-base gap-2">
                <span className="text-xl">{avatar}</span>
                <span>Join as {name || 'Anonymous'}</span>
              </button>
            </form>

            <button onClick={() => setStep('code')} className="btn-ghost w-full text-sm mt-3">
              ← Change code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
