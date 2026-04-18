import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4 py-12">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-40"
        style={{ background: 'radial-gradient(ellipse, rgba(0,87,255,0.1) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 anim-fade-up">
          <Link to="/" className="inline-flex items-center gap-3 group mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-blue-md transition-all group-hover:scale-110 group-hover:rotate-3"
              style={{ background: 'linear-gradient(135deg,#0057FF,#003ABF)' }}>
              <Zap size={24} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-2xl text-[var(--ink)]">PeersQ</span>
          </Link>
          <h1 className="font-display font-bold text-4xl text-[var(--ink)] mb-2" style={{ letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p className="text-[var(--slate)]">Sign in to your account and start hosting</p>
        </div>

        <div className="surface p-8 anim-fade-up d1">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[var(--ink)] mb-2">Email Address</label>
              <div className="relative">
                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--slate-light)' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-[var(--ink)]">Password</label>
              </div>
              <div className="relative">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--slate-light)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field pl-11 pr-12"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--slate-light)' }}>
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base mt-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Sign In</span><ArrowRight size={18} /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px" style={{ background: 'var(--paper)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs font-medium text-[var(--slate-light)]"
                style={{ background: 'white' }}>or</span>
            </div>
          </div>

          <Link to="/join"
            className="btn-secondary w-full py-3.5 text-sm flex items-center justify-center gap-2">
            Join a quiz as participant
          </Link>
        </div>

        <p className="text-center text-[var(--slate)] text-sm mt-6 anim-fade-up d2">
          New to PeersQ?{' '}
          <Link to="/register" className="font-semibold transition-colors"
            style={{ color: 'var(--blue-vivid)' }}>Create free account →</Link>
        </p>
      </div>
    </div>
  )
}
