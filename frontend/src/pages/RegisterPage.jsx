import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, ArrowRight, Mail, Lock, User, RefreshCw, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

const STEPS = ['details', 'otp', 'password']

export default function RegisterPage() {
  const [step, setStep] = useState('details')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const otpRefs = useRef([])
  const { register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendTimer])

  const handleDetails = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Enter your name')
    if (!form.email.includes('@')) return toast.error('Enter a valid email')
    setLoading(true)
    try {
      await api.post('/auth/request-otp', { email: form.email, name: form.name })
      toast.success(`Verification code sent to ${form.email}`)
      setStep('otp')
      setResendTimer(60)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpInput = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const newOtp = [...otp]
    newOtp[i] = val.slice(-1)
    setOtp(newOtp)
    if (val && i < 5) otpRefs.current[i + 1]?.focus()
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      handleVerifyOtp(newOtp.join(''))
    }
  }

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus()
    }
  }

  const handleVerifyOtp = async (code) => {
    const otpCode = code || otp.join('')
    if (otpCode.length !== 6) return toast.error('Enter the 6-digit code')
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', { email: form.email, otp: otpCode })
      toast.success('Email verified!')
      setStep('password')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      await api.post('/auth/request-otp', { email: form.email, name: form.name })
      toast.success('New code sent!')
      setResendTimer(60)
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err) {
      toast.error('Failed to resend')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      toast.success('Welcome to PeersQ! 🎉')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const stepProgress = { details: 33, otp: 66, password: 100 }[step]

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4 py-12">
      {/* Background decorations */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(0,87,255,0.12) 0%, transparent 70%)' }} />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(0,212,255,0.15) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 anim-fade-up">
          <Link to="/" className="inline-flex items-center gap-3 group mb-6">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-blue-md transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg,#0057FF,#003ABF)' }}>
              <Zap size={22} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-2xl text-[var(--ink)]">PeersQ</span>
          </Link>
          <h1 className="font-display font-bold text-3xl text-[var(--ink)] mb-1">Create account</h1>
          <p className="text-[var(--slate)] text-sm">Start hosting interactive quizzes for free</p>
        </div>

        {/* Step progress */}
        <div className="mb-6 anim-fade-up d1">
          <div className="flex items-center justify-between mb-2 text-xs text-[var(--slate)]">
            <span>Step {STEPS.indexOf(step) + 1} of 3</span>
            <span className="font-mono font-semibold text-[var(--blue-vivid)]">{stepProgress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stepProgress}%` }} />
          </div>
        </div>

        <div className="surface p-8 anim-fade-up d2">

          {/* ── STEP 1: Details ── */}
          {step === 'details' && (
            <form onSubmit={handleDetails} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--ink)] mb-2">Your Name</label>
                <div className="relative">
                  <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--slate-light)]" />
                  <input type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input-field pl-11" placeholder="Alex Johnson" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--ink)] mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--slate-light)]" />
                  <input type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input-field pl-11" placeholder="you@example.com" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Send Verification Code</span><ArrowRight size={18} /></>
                }
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 'otp' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(0,87,255,0.08)' }}>
                  <Mail size={28} style={{ color: 'var(--blue-vivid)' }} />
                </div>
                <h2 className="font-display font-bold text-xl text-[var(--ink)] mb-1">Check your email</h2>
                <p className="text-[var(--slate)] text-sm">
                  We sent a 6-digit code to<br />
                  <strong className="text-[var(--ink)]">{form.email}</strong>
                </p>
              </div>

              {/* OTP boxes */}
              <div className="flex items-center justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onFocus={e => e.target.select()}
                    className={`otp-input ${digit ? 'filled' : ''}`}
                  />
                ))}
              </div>

              <button
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.join('').length < 6}
                className="btn-primary w-full py-4 text-base">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><CheckCircle size={18} /><span>Verify Code</span></>
                }
              </button>

              <div className="text-center">
                <button onClick={handleResend} disabled={resendTimer > 0 || loading}
                  className="text-sm text-[var(--slate)] hover:text-[var(--blue-vivid)] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50">
                  <RefreshCw size={14} />
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                </button>
              </div>

              <button onClick={() => setStep('details')} className="btn-ghost w-full text-sm">
                ← Change email
              </button>
            </div>
          )}

          {/* ── STEP 3: Password ── */}
          {step === 'password' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-xl mb-2"
                style={{ background: 'rgba(0,232,122,0.08)', border: '1px solid rgba(0,232,122,0.2)' }}>
                <CheckCircle size={18} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                <p className="text-sm font-medium" style={{ color: '#009B55' }}>
                  {form.email} verified
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--ink)] mb-2">Create Password</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--slate-light)]" />
                  <input type="password" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="input-field pl-11" placeholder="Min. 6 characters" required />
                </div>
                <div className="mt-2 flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{
                        background: form.password.length >= i * 2
                          ? form.password.length >= 8 ? 'var(--accent-green)' : 'var(--blue-vivid)'
                          : 'var(--paper)'
                      }} />
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Zap size={18} fill="white" /><span>Create My Account</span></>
                }
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[var(--slate)] text-sm mt-6 anim-fade-up d3">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold transition-colors"
            style={{ color: 'var(--blue-vivid)' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}
