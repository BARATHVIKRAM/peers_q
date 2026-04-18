import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users, Play, SkipForward, Trophy, Zap, Copy, ChevronRight,
  Clock, X, StopCircle, QrCode, BarChart2, Eye
} from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import toast from 'react-hot-toast'

const OPT_COLORS = [
  { bg: 'rgba(0,87,255,0.07)', border: '#0057FF', fill: '#0057FF', light: 'rgba(0,87,255,0.15)' },
  { bg: 'rgba(139,92,246,0.07)', border: '#8B5CF6', fill: '#8B5CF6', light: 'rgba(139,92,246,0.15)' },
  { bg: 'rgba(245,158,11,0.07)', border: '#F59E0B', fill: '#F59E0B', light: 'rgba(245,158,11,0.15)' },
  { bg: 'rgba(239,68,68,0.07)', border: '#EF4444', fill: '#EF4444', light: 'rgba(239,68,68,0.15)' },
]
const LETTERS = ['A', 'B', 'C', 'D']

export default function HostSessionPage() {
  const { sessionCode } = useParams()
  const { socket } = useSocket()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('lobby')
  const [session, setSession] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [participants, setParticipants] = useState([])
  const [currentQ, setCurrentQ] = useState(null)
  const [qIndex, setQIndex] = useState(0)
  const [totalQs, setTotalQs] = useState(0)
  const [answerUpdate, setAnswerUpdate] = useState({ answerCount: 0, totalParticipants: 0 })
  const [qResults, setQResults] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)

  useEffect(() => {
    if (!socket) return
    socket.emit('host:join_session', { sessionCode })

    socket.on('host:session_ready', ({ session: s, quiz: q, participants: p }) => {
      setSession(s); setQuiz(q); setParticipants(p || [])
      setTotalQs(q?.questions?.length || 0)
    })

    socket.on('participants:updated', ({ participants: p }) => setParticipants(p))

    socket.on('question:countdown', ({ seconds, questionIndex, totalQuestions }) => {
      setPhase('countdown')
      setQIndex(questionIndex)
      setTotalQs(totalQuestions)
      let s = seconds
      setCountdown(s)
      clearInterval(countdownRef.current)
      countdownRef.current = setInterval(() => {
        s--; setCountdown(s)
        if (s <= 0) clearInterval(countdownRef.current)
      }, 1000)
    })

    socket.on('question:start_host', ({ question, questionIndex: qi, totalQuestions: tq, startTime }) => {
      setCurrentQ(question); setQIndex(qi); setTotalQs(tq)
      setPhase('question')
      setAnswerUpdate({ answerCount: 0, totalParticipants: participants.length })
      clearTimeout(timerRef.current)
      const start = new Date(startTime)
      const tick = () => {
        const rem = Math.max(0, question.timeLimit - (Date.now() - start) / 1000)
        setTimeLeft(Math.ceil(rem))
        if (rem > 0) timerRef.current = setTimeout(tick, 200)
      }
      tick()
    })

    socket.on('host:answer_update', data => setAnswerUpdate(data))

    socket.on('question:ended', ({ correctAnswerId, correctAnswerIds, answerStats, totalAnswers, explanation }) => {
      clearTimeout(timerRef.current)
      setQResults({ correctAnswerId, correctAnswerIds: correctAnswerIds || [correctAnswerId], answerStats, totalAnswers, explanation })
      setPhase('results')
    })

    socket.on('leaderboard:show', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      setPhase('leaderboard')
    })

    socket.on('quiz:finished', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      setPhase('finished')
    })

    socket.on('error', ({ message }) => toast.error(message))

    return () => {
      ['host:session_ready','participants:updated','question:countdown','question:start_host',
       'host:answer_update','question:ended','leaderboard:show','quiz:finished','error']
        .forEach(e => socket.off(e))
      clearTimeout(timerRef.current)
      clearInterval(countdownRef.current)
    }
  }, [socket, sessionCode])

  const startAndNext = () => {
    socket?.emit('host:start_quiz', { sessionCode })
    socket?.emit('host:next_question', { sessionCode })
  }
  const nextQuestion = () => socket?.emit('host:next_question', { sessionCode })
  const endQuestion = () => socket?.emit('host:end_question', { sessionCode })
  const showLeaderboard = () => socket?.emit('host:show_leaderboard', { sessionCode })
  const endQuiz = () => { if (confirm('End quiz for all participants?')) socket?.emit('host:end_quiz', { sessionCode }) }
  const copyCode = () => { navigator.clipboard.writeText(sessionCode); toast.success('Code copied!') }

  const timerPct = currentQ ? (timeLeft / currentQ.timeLimit) * 100 : 100
  const isLastQ = qIndex + 1 >= totalQs

  if (!session) return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
          style={{ border: '3px solid var(--paper)', borderTopColor: 'var(--blue-vivid)' }} />
        <p className="text-[var(--slate)]">Connecting to session...</p>
      </div>
    </div>
  )

  // ─────────────────────────────────────
  // LOBBY
  // ─────────────────────────────────────
  if (phase === 'lobby') return (
    <div className="min-h-screen page-bg">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0057FF,#003ABF)' }}>
              <Zap size={20} className="text-white" fill="white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-[var(--ink)]">{quiz?.title}</h1>
              <p className="text-sm text-[var(--slate)]">{quiz?.questions?.length} questions</p>
            </div>
          </div>
          <button onClick={endQuiz} className="btn-ghost text-sm gap-1.5" style={{ color: 'var(--accent-coral)' }}>
            <X size={15} /> End Session
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="surface p-8 text-center">
            <p className="text-xs font-semibold text-[var(--slate)] uppercase tracking-wider mb-3">JOIN CODE</p>
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="font-mono font-bold text-[clamp(2.5rem,8vw,4rem)] text-[var(--ink)]"
                style={{ letterSpacing: '0.15em' }}>
                {sessionCode}
              </span>
              <button onClick={copyCode}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(0,87,255,0.08)' }}>
                <Copy size={16} style={{ color: 'var(--blue-vivid)' }} />
              </button>
            </div>
            <p className="text-xs text-[var(--slate)] mb-5">
              {window.location.host}/join
            </p>
            <button onClick={() => setShowQR(!showQR)} className="btn-secondary gap-2 text-sm mx-auto mb-4">
              <QrCode size={15} /> {showQR ? 'Hide' : 'Show'} QR Code
            </button>
            {showQR && session.qrCode && (
              <div className="inline-block p-4 rounded-2xl bg-white shadow-blue-sm mt-1">
                <img src={session.qrCode} alt="QR Code" className="w-44 h-44" />
              </div>
            )}
          </div>

          <div className="surface p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} style={{ color: 'var(--blue-vivid)' }} />
                <span className="font-display font-bold text-lg text-[var(--ink)]">
                  {participants.length} joined
                </span>
              </div>
              <span className="chip chip-blue">max 50</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-52 space-y-1.5 pr-1 mb-4">
              {participants.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">👋</div>
                  <p className="text-sm text-[var(--slate)]">Waiting for participants...</p>
                </div>
              ) : (
                participants.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl anim-slide-right"
                    style={{ background: 'var(--off-white)', animationDelay: `${i * 0.04}s` }}>
                    <span className="text-xl">{p.avatar}</span>
                    <span className="text-sm font-medium text-[var(--ink)] flex-1 truncate">{p.name || 'Anonymous'}</span>
                    {i >= participants.length - 3 && <span className="chip chip-green text-xs">new</span>}
                  </div>
                ))
              )}
            </div>
            <button onClick={startAndNext} disabled={participants.length === 0}
              className="btn-primary w-full py-4 text-base gap-2 disabled:opacity-40">
              <Play size={20} fill="white" /> Start Quiz · {quiz?.questions?.length} Questions
            </button>
            <p className="text-xs text-center text-[var(--slate)] mt-2">
              Players without a name get a random one
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────
  // 5s COUNTDOWN
  // ─────────────────────────────────────
  if (phase === 'countdown') return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center anim-scale-in">
        <p className="text-[var(--slate)] font-semibold uppercase tracking-wider text-sm mb-2">
          Question {qIndex + 1} of {totalQs}
        </p>
        <div key={countdown}
          className="font-display font-bold leading-none"
          style={{
            fontSize: 'clamp(6rem,20vw,10rem)',
            color: 'var(--blue-vivid)',
            textShadow: '0 0 60px rgba(0,87,255,0.25)',
            animation: 'countdownBeat 1s ease-in-out'
          }}>
          {countdown}
        </div>
        <p className="text-[var(--slate)] text-lg mt-3">Get ready!</p>
      </div>
    </div>
  )

  // ─────────────────────────────────────
  // ACTIVE QUESTION (HOST VIEW)
  // ─────────────────────────────────────
  if (phase === 'question' && currentQ) return (
    <div className="min-h-screen page-bg">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="progress-bar mb-4">
          <div className={`progress-fill ${timerPct < 25 ? 'danger' : ''}`} style={{ width: `${timerPct}%` }} />
        </div>

        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-medium text-[var(--slate)]">Q {qIndex + 1} / {totalQs}</span>
          <div className={`flex items-center gap-1.5 font-mono font-bold text-2xl ${timeLeft <= 5 ? 'anim-countdown-beat' : ''}`}
            style={{ color: timeLeft <= 5 ? 'var(--accent-coral)' : 'var(--ink)' }}>
            <Clock size={20} />{timeLeft}s
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--slate)]">{answerUpdate.answerCount}/{answerUpdate.totalParticipants}</span>
            <span className="chip chip-blue">{answerUpdate.percentage || 0}% answered</span>
          </div>
        </div>

        <div className="surface p-6 mb-5 text-center">
          {currentQ.image && <img src={currentQ.image} alt="" className="w-full max-h-44 object-cover rounded-2xl mb-4" />}
          <h2 className="font-display font-bold text-2xl text-[var(--ink)]">{currentQ.text}</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {currentQ.options.map((opt, i) => {
            const c = OPT_COLORS[i % OPT_COLORS.length]
            return (
              <div key={opt.id} className="p-4 rounded-2xl border-2 flex items-center gap-3"
                style={{ background: c.bg, borderColor: c.border + '40' }}>
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: c.fill }}>
                  {LETTERS[i]}
                </span>
                <span className="font-medium text-[var(--ink)]">{opt.text}</span>
                {opt.isCorrect && <span className="ml-auto chip chip-green text-xs">✓</span>}
              </div>
            )
          })}
        </div>

        <div className="flex justify-center gap-3">
          <button onClick={endQuestion} className="btn-secondary gap-2 py-3">
            <SkipForward size={16} /> End Early
          </button>
          <button onClick={endQuiz} className="btn-ghost gap-1.5 text-sm" style={{ color: 'var(--accent-coral)' }}>
            <StopCircle size={15} /> End Quiz
          </button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────
  // RESULTS — host sees stats, controls when to show leaderboard
  // ─────────────────────────────────────
  if (phase === 'results') return (
    <div className="min-h-screen page-bg">
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display font-bold text-2xl text-[var(--ink)]">Answer Results</h2>
            <p className="text-sm text-[var(--slate)] mt-0.5">
              {qResults?.totalAnswers || 0} of {participants.length} answered · Q{qIndex + 1}/{totalQs}
            </p>
          </div>
          <div className="chip chip-blue flex items-center gap-1.5">
            <Eye size={13} />
            Participants see this too
          </div>
        </div>

        {/* Question text */}
        <div className="surface p-5 mb-4">
          <p className="text-xs font-semibold text-[var(--slate)] uppercase tracking-wider mb-2">Question</p>
          <p className="font-display font-bold text-lg text-[var(--ink)]">{currentQ?.text}</p>
        </div>

        {/* Answer distribution bars — the key insight view */}
        <div className="surface p-6 mb-4">
          <p className="text-sm font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
            <BarChart2 size={16} style={{ color: 'var(--blue-vivid)' }} />
            Answer Distribution
          </p>
          <div className="space-y-3">
            {currentQ?.options.map((opt, i) => {
              const stat = qResults?.answerStats?.[opt.id] || { count: 0 }
              const total = Object.values(qResults?.answerStats || {}).reduce((s, v) => s + v.count, 0)
              const pct = total > 0 ? Math.round((stat.count / total) * 100) : 0
              const isCorrect = (qResults?.correctAnswerIds || [qResults?.correctAnswerId]).includes(opt.id)
              const c = OPT_COLORS[i % OPT_COLORS.length]

              return (
                <div key={opt.id}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: isCorrect ? 'var(--accent-green)' : c.fill }}>
                      {LETTERS[i]}
                    </span>
                    <span className="flex-1 text-sm font-medium text-[var(--ink)] truncate">{opt.text}</span>
                    <span className="font-mono text-sm font-bold text-[var(--ink)]">
                      {stat.count} <span className="text-[var(--slate)] font-normal">({pct}%)</span>
                    </span>
                    {isCorrect && (
                      <span className="chip chip-green text-xs flex-shrink-0">✓ correct</span>
                    )}
                  </div>
                  {/* Bar */}
                  <div className="h-3 rounded-full overflow-hidden ml-9"
                    style={{ background: 'var(--paper)' }}>
                    <div className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        background: isCorrect
                          ? 'linear-gradient(90deg,var(--accent-green),#00C06A)'
                          : `linear-gradient(90deg,${c.fill}CC,${c.fill}88)`
                      }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Explanation */}
          {qResults?.explanation && (
            <div className="mt-5 p-4 rounded-2xl flex gap-3"
              style={{ background: 'rgba(0,87,255,0.05)', border: '1px solid rgba(0,87,255,0.12)' }}>
              <span className="text-xl flex-shrink-0">💡</span>
              <p className="text-sm text-[var(--ink)] leading-relaxed">{qResults.explanation}</p>
            </div>
          )}
        </div>

        {/* Host action bar — show leaderboard is the primary CTA */}
        <div className="surface p-4">
          <p className="text-xs text-center text-[var(--slate)] mb-3">
            Participants are waiting on this screen. Click when ready to advance.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={endQuiz} className="btn-ghost gap-1.5 text-sm" style={{ color: 'var(--accent-coral)' }}>
              <StopCircle size={15} /> End Quiz
            </button>
            <button onClick={showLeaderboard}
              className="btn-primary gap-2 py-3.5 px-8 text-base">
              <Trophy size={18} />
              Show Leaderboard
            </button>
          </div>
        </div>

      </div>
    </div>
  )

  // ─────────────────────────────────────
  // LEADERBOARD (animated reveal)
  // ─────────────────────────────────────
  if (phase === 'leaderboard' || phase === 'finished') return (
    <LeaderboardView
      leaderboard={leaderboard}
      phase={phase}
      qIndex={qIndex}
      totalQs={totalQs}
      isLastQ={isLastQ}
      onNext={nextQuestion}
      onEnd={() => navigate('/dashboard')}
      onEndQuiz={endQuiz}
    />
  )

  return null
}

function LeaderboardView({ leaderboard, phase, qIndex, totalQs, isLastQ, onNext, onEnd, onEndQuiz }) {
  const [displayed, setDisplayed] = useState([])

  useEffect(() => {
    setDisplayed([])
    const timers = leaderboard.map((_, i) =>
      setTimeout(() => setDisplayed(d => [...d, i]), i * 130 + 200)
    )
    return () => timers.forEach(clearTimeout)
  }, [leaderboard])

  const rankLabel = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

  return (
    <div className="min-h-screen page-bg">
      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="text-center mb-6">
          <Trophy size={36} className="mx-auto mb-3" style={{ color: 'var(--accent-gold)' }} />
          <h2 className="font-display font-bold text-3xl text-[var(--ink)]" style={{ letterSpacing: '-0.02em' }}>
            {phase === 'finished' ? 'Final Results!' : 'Leaderboard'}
          </h2>
          {phase !== 'finished' && (
            <p className="text-[var(--slate)] text-sm mt-1">After question {qIndex + 1} of {totalQs}</p>
          )}
        </div>

        <div className="space-y-2 mb-6">
          {leaderboard.slice(0, 10).map((p, i) => (
            <div key={`${p.name}-${i}`}
              className={`lb-item rank-${i + 1}`}
              style={{
                opacity: displayed.includes(i) ? 1 : 0,
                transform: displayed.includes(i) ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
                transition: 'all 0.65s cubic-bezier(0.34,1.2,0.64,1)'
              }}>
              <span className="font-bold text-xl w-10 text-center flex-shrink-0"
                style={{
                  color: i === 0 ? 'var(--accent-gold)'
                    : i === 1 ? '#94A3B8'
                    : i === 2 ? '#CD7F32'
                    : 'var(--slate)'
                }}>
                {rankLabel(i)}
              </span>
              <span className="text-2xl flex-shrink-0">{p.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--ink)] truncate">{p.name}</p>
                <p className="text-xs text-[var(--slate)]">
                  {p.correctAnswers}/{p.totalAnswers} correct
                  {p.streak > 1 && ` · 🔥 ${p.streak} streak`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-bold text-[var(--ink)]">{p.score.toLocaleString()}</p>
                <p className="text-xs text-[var(--slate)]">pts</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          {phase !== 'finished' ? (
            <>
              <button onClick={onEndQuiz} className="btn-ghost gap-1.5 text-sm" style={{ color: 'var(--accent-coral)' }}>
                <StopCircle size={15} /> End Quiz
              </button>
              <button onClick={onNext} className="btn-primary gap-2 py-3 px-8">
                {isLastQ ? 'Finish Quiz' : 'Next Question'}
                <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <button onClick={onEnd} className="btn-primary gap-2 py-3 px-8">
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
