import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users, Play, SkipForward, Trophy, Zap, Copy, ChevronRight,
  Clock, X, StopCircle, QrCode, BarChart2, Eye, EyeOff
} from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import toast from 'react-hot-toast'

const OPT_COLORS = [
  { bg: 'rgba(0,87,255,0.07)', border: '#0057FF', fill: '#0057FF' },
  { bg: 'rgba(139,92,246,0.07)', border: '#8B5CF6', fill: '#8B5CF6' },
  { bg: 'rgba(245,158,11,0.07)', border: '#F59E0B', fill: '#F59E0B' },
  { bg: 'rgba(239,68,68,0.07)', border: '#EF4444', fill: '#EF4444' },
]
const LETTERS = ['A', 'B', 'C', 'D']
const CONFETTI_COLORS = ['#0057FF', '#00D4FF', '#FFB800', '#00E87A', '#FF4060', '#8B5CF6', '#FFF']

// ── Confetti ──
function Confetti({ count = 100 }) {
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${Math.random() * 100}%`,
      width: `${6 + Math.random() * 8}px`,
      height: `${8 + Math.random() * 14}px`,
      duration: `${2.5 + Math.random() * 3}s`,
      delay: `${Math.random() * 2}s`,
      rotate: `${Math.random() * 360}deg`,
      borderRadius: Math.random() > 0.5 ? '50%' : '3px'
    }))
  ).current

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9999 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.left, top: '-20px',
          width: p.width, height: p.height,
          background: p.color,
          borderRadius: p.borderRadius,
          animation: `confettiFall ${p.duration} ${p.delay} linear forwards`,
          transform: `rotate(${p.rotate})`
        }} />
      ))}
    </div>
  )
}

// ── Winner Celebration — shown on host screen (TV mirror) ──
function WinnerCelebration({ winner, onDismiss }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 1000,
        background: 'rgba(10,15,30,0.88)',
        backdropFilter: 'blur(10px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease'
      }}>
      <div className="text-center px-8"
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.7)',
          transition: 'transform 0.8s cubic-bezier(0.34,1.56,0.64,1)'
        }}>
        {/* Crown */}
        <div className="text-7xl mb-3" style={{ animation: 'float 2s ease-in-out infinite' }}>👑</div>

        {/* Avatar */}
        <div className="w-36 h-36 rounded-full flex items-center justify-center mx-auto mb-5 text-7xl"
          style={{
            background: 'linear-gradient(135deg,#FFB800,#FF8C00)',
            boxShadow: '0 0 80px rgba(255,184,0,0.7), 0 0 160px rgba(255,184,0,0.3)',
            animation: 'winnerGlow 2s ease-in-out infinite'
          }}>
          {winner.avatar}
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-5 font-bold text-lg"
          style={{ background: 'linear-gradient(135deg,#FFB800,#FF8C00)', color: 'white' }}>
          🏆 &nbsp;WINNER
        </div>

        <h2 className="font-display font-bold text-white mb-2"
          style={{
            fontSize: 'clamp(2.5rem,6vw,4rem)',
            letterSpacing: '-0.03em',
            textShadow: '0 0 60px rgba(255,184,0,0.6)'
          }}>
          {winner.name}
        </h2>

        <p className="font-mono font-bold mb-1"
          style={{ fontSize: 'clamp(2rem,5vw,3rem)', color: 'var(--accent-gold)' }}>
          {winner.score.toLocaleString()} pts
        </p>

        <p className="text-white/50 text-sm mb-6">
          {winner.correctAnswers}/{winner.totalAnswers} correct answers
          {winner.streak > 1 && ` · 🔥 ${winner.streak} streak`}
        </p>

        <p className="text-white/40 text-xs mb-8">
          {winner.correctAnswers}/{winner.totalAnswers} correct · {winner.streak > 1 ? `🔥 ${winner.streak} streak` : ''}
        </p>

        <button onClick={onDismiss} className="btn-primary gap-2 px-10 py-4 text-lg"
          style={{ background: 'linear-gradient(135deg,#FFB800,#FF8C00)', boxShadow: '0 12px 40px rgba(255,184,0,0.5)' }}>
          See Final Leaderboard →
        </button>
      </div>
    </div>
  )
}

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
  const [showAnswerKey, setShowAnswerKey] = useState(false) // host-only toggle during question
  const [showWinner, setShowWinner] = useState(false)
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
      setQIndex(questionIndex); setTotalQs(totalQuestions)
      setShowAnswerKey(false)
      let s = seconds; setCountdown(s)
      clearInterval(countdownRef.current)
      countdownRef.current = setInterval(() => {
        s--; setCountdown(s)
        if (s <= 0) clearInterval(countdownRef.current)
      }, 1000)
    })

    socket.on('question:start_host', ({ question, questionIndex: qi, totalQuestions: tq, startTime }) => {
      setCurrentQ(question); setQIndex(qi); setTotalQs(tq)
      setShowAnswerKey(false) // always start masked
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
      setLeaderboard(lb); setPhase('leaderboard')
    })

    socket.on('quiz:finished', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      setPhase('finished')
      // Short delay then show winner celebration on TV
      setTimeout(() => setShowWinner(true), 800)
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
        <p className="text-[var(--slate)]">Connecting...</p>
      </div>
    </div>
  )

  // ────────────────────────────────────
  // LOBBY
  // ────────────────────────────────────
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
          {/* Code card */}
          <div className="surface p-8 text-center">
            <p className="text-xs font-semibold text-[var(--slate)] uppercase tracking-wider mb-3">JOIN CODE</p>
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="font-mono font-bold text-[clamp(2.5rem,8vw,4rem)] text-[var(--ink)]"
                style={{ letterSpacing: '0.15em' }}>
                {sessionCode}
              </span>
              <button onClick={copyCode}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                style={{ background: 'rgba(0,87,255,0.08)' }}>
                <Copy size={16} style={{ color: 'var(--blue-vivid)' }} />
              </button>
            </div>
            <p className="text-xs text-[var(--slate)] mb-5">{window.location.host}/join</p>
            <button onClick={() => setShowQR(!showQR)} className="btn-secondary gap-2 text-sm mb-4">
              <QrCode size={15} /> {showQR ? 'Hide' : 'Show'} QR Code
            </button>
            {showQR && session.qrCode && (
              <div className="inline-block p-4 rounded-2xl bg-white shadow-blue-sm">
                <img src={session.qrCode} alt="QR Code" className="w-44 h-44" />
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="surface p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} style={{ color: 'var(--blue-vivid)' }} />
                <span className="font-display font-bold text-lg text-[var(--ink)]">{participants.length} joined</span>
              </div>
              <span className="chip chip-blue">max 50</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-52 space-y-1.5 pr-1 mb-4">
              {participants.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">👋</div>
                  <p className="text-sm text-[var(--slate)]">Waiting for participants...</p>
                </div>
              ) : participants.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl anim-slide-right"
                  style={{ background: 'var(--off-white)', animationDelay: `${i * 0.04}s` }}>
                  <span className="text-xl">{p.avatar}</span>
                  <span className="text-sm font-medium text-[var(--ink)] flex-1 truncate">{p.name || 'Anonymous'}</span>
                  {i >= participants.length - 3 && <span className="chip chip-green text-xs">new</span>}
                </div>
              ))}
            </div>
            <button onClick={startAndNext} disabled={participants.length === 0}
              className="btn-primary w-full py-4 text-base gap-2 disabled:opacity-40">
              <Play size={20} fill="white" /> Start Quiz · {quiz?.questions?.length} Questions
            </button>
            <p className="text-xs text-center text-[var(--slate)] mt-2">Players without a name get a random one</p>
          </div>
        </div>
      </div>
    </div>
  )

  // ────────────────────────────────────
  // COUNTDOWN
  // ────────────────────────────────────
  if (phase === 'countdown') return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center anim-scale-in">
        <p className="text-[var(--slate)] font-semibold uppercase tracking-wider text-sm mb-2">
          Question {qIndex + 1} of {totalQs}
        </p>
        <div key={countdown} className="font-display font-bold leading-none"
          style={{
            fontSize: 'clamp(8rem,20vw,12rem)',
            color: 'var(--blue-vivid)',
            textShadow: '0 0 80px rgba(0,87,255,0.3)',
            animation: 'countdownBeat 1s ease-in-out'
          }}>
          {countdown}
        </div>
        <p className="text-[var(--slate)] text-xl mt-3">Get ready!</p>
      </div>
    </div>
  )

  // ────────────────────────────────────
  // ACTIVE QUESTION
  // Answers are MASKED — shown as blank colored tiles on TV
  // Host has a small private toggle to peek at answer key
  // ────────────────────────────────────
  if (phase === 'question' && currentQ) return (
    <div className="min-h-screen page-bg">
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Timer bar */}
        <div className="progress-bar mb-5">
          <div className={`progress-fill ${timerPct < 25 ? 'danger' : ''}`} style={{ width: `${timerPct}%` }} />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-sm font-semibold text-[var(--slate)]">Q {qIndex + 1} / {totalQs}</span>
          <div className={`flex items-center gap-2 font-mono font-bold text-3xl ${timeLeft <= 5 ? 'anim-countdown-beat' : ''}`}
            style={{ color: timeLeft <= 5 ? 'var(--accent-coral)' : 'var(--ink)' }}>
            <Clock size={26} />{timeLeft}s
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--slate)]">
              {answerUpdate.answerCount}/{answerUpdate.totalParticipants} answered
            </span>
            <span className="chip chip-blue font-mono">{answerUpdate.percentage || 0}%</span>
          </div>
        </div>

        {/* Question — large, clear for TV */}
        <div className="surface p-8 mb-6 text-center"
          style={{ boxShadow: '0 8px 40px rgba(0,87,255,0.08)' }}>
          {currentQ.image && (
            <img src={currentQ.image} alt="" className="w-full max-h-56 object-cover rounded-2xl mb-5" />
          )}
          <h2 className="font-display font-bold text-[clamp(1.4rem,3vw,2rem)] text-[var(--ink)] leading-tight">
            {currentQ.text}
          </h2>
        </div>

        {/* Answer tiles — MASKED on TV, letters + colors only */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {currentQ.options.map((opt, i) => {
            const c = OPT_COLORS[i % OPT_COLORS.length]
            return (
              <div key={opt.id}
                className="p-5 rounded-3xl border-2 flex items-center gap-4 transition-all"
                style={{ background: c.bg, borderColor: c.border + '50' }}>
                {/* Letter badge — always visible */}
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                  style={{ background: c.fill }}>
                  {LETTERS[i]}
                </span>
                {/* Answer text — blurred/hidden unless host peeks */}
                <div className="flex-1 relative overflow-hidden">
                  <span className={`font-medium text-[var(--ink)] text-base block transition-all duration-300 ${
                    showAnswerKey ? '' : 'blur-sm select-none'
                  }`}>
                    {opt.text}
                  </span>
                  {!showAnswerKey && (
                    <span className="absolute inset-0 flex items-center">
                      <span className="h-2.5 rounded-full w-4/5"
                        style={{ background: c.fill + '30' }} />
                    </span>
                  )}
                </div>
                {/* Correct marker — only when peeking */}
                {showAnswerKey && opt.isCorrect && (
                  <span className="chip chip-green text-xs flex-shrink-0">✓</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Host controls — small bar at bottom */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Private peek toggle — small and subtle */}
            <button onClick={() => setShowAnswerKey(k => !k)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all"
              style={{
                background: showAnswerKey ? 'rgba(0,87,255,0.1)' : 'var(--paper)',
                color: showAnswerKey ? 'var(--blue-vivid)' : 'var(--slate)',
                border: showAnswerKey ? '1px solid rgba(0,87,255,0.2)' : '1px solid var(--paper)'
              }}>
              {showAnswerKey ? <Eye size={13} /> : <EyeOff size={13} />}
              {showAnswerKey ? 'Answers visible (private)' : 'Peek at answers'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={endQuestion} className="btn-secondary gap-1.5 py-2 text-sm">
              <SkipForward size={15} /> End Early
            </button>
            <button onClick={endQuiz} className="btn-ghost gap-1.5 text-sm" style={{ color: 'var(--accent-coral)' }}>
              <StopCircle size={14} /> End Quiz
            </button>
          </div>
        </div>

      </div>
    </div>
  )

  // ────────────────────────────────────
  // RESULTS — full stats visible on TV
  // Host controls when to show leaderboard
  // ────────────────────────────────────
  if (phase === 'results') return (
    <div className="min-h-screen page-bg">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display font-bold text-2xl text-[var(--ink)]">Answer Results</h2>
            <p className="text-sm text-[var(--slate)] mt-0.5">
              {qResults?.totalAnswers || 0} of {participants.length} answered · Q{qIndex + 1}/{totalQs}
            </p>
          </div>
          <span className="chip chip-blue flex items-center gap-1.5 text-xs">
            <Eye size={12} /> Visible on TV
          </span>
        </div>

        {/* Question */}
        <div className="surface p-5 mb-4">
          <p className="text-xs font-semibold text-[var(--slate)] uppercase tracking-wider mb-2">Question</p>
          <p className="font-display font-bold text-xl text-[var(--ink)] leading-snug">{currentQ?.text}</p>
        </div>

        {/* Answer distribution — large bars, clear on TV */}
        <div className="surface p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={17} style={{ color: 'var(--blue-vivid)' }} />
            <span className="font-display font-bold text-base text-[var(--ink)]">Answer Distribution</span>
          </div>

          <div className="space-y-4">
            {currentQ?.options.map((opt, i) => {
              const stat = qResults?.answerStats?.[opt.id] || { count: 0 }
              const total = Object.values(qResults?.answerStats || {}).reduce((s, v) => s + v.count, 0)
              const pct = total > 0 ? Math.round((stat.count / total) * 100) : 0
              const isCorrect = (qResults?.correctAnswerIds || [qResults?.correctAnswerId]).includes(opt.id)
              const c = OPT_COLORS[i % OPT_COLORS.length]

              return (
                <div key={opt.id}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: isCorrect ? 'var(--accent-green)' : c.fill }}>
                      {LETTERS[i]}
                    </span>
                    <span className="flex-1 font-medium text-[var(--ink)]">{opt.text}</span>
                    <span className="font-mono font-bold text-lg text-[var(--ink)]">
                      {stat.count}
                      <span className="text-sm font-normal text-[var(--slate)] ml-1">({pct}%)</span>
                    </span>
                    {isCorrect && <span className="chip chip-green font-bold">✓ correct</span>}
                  </div>
                  {/* Tall bar — easy to read on TV */}
                  <div className="h-5 rounded-full overflow-hidden ml-11"
                    style={{ background: 'var(--paper)' }}>
                    <div className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        background: isCorrect
                          ? 'linear-gradient(90deg,#00E87A,#00C06A)'
                          : `linear-gradient(90deg,${c.fill}CC,${c.fill}66)`,
                        minWidth: pct > 0 ? '8px' : '0'
                      }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Explanation */}
          {qResults?.explanation && (
            <div className="mt-5 p-4 rounded-2xl flex gap-3"
              style={{ background: 'rgba(0,87,255,0.05)', border: '1px solid rgba(0,87,255,0.1)' }}>
              <span className="text-xl flex-shrink-0">💡</span>
              <p className="text-sm text-[var(--ink)] leading-relaxed">{qResults.explanation}</p>
            </div>
          )}
        </div>

        {/* Host action — centered, prominent */}
        <div className="surface p-5 text-center">
          <p className="text-xs text-[var(--slate)] mb-4">
            Participants are viewing this screen too. Click when ready to continue.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={endQuiz} className="btn-ghost gap-1.5 text-sm" style={{ color: 'var(--accent-coral)' }}>
              <StopCircle size={15} /> End Quiz
            </button>
            <button onClick={showLeaderboard} className="btn-primary gap-2 py-3.5 px-8 text-base">
              <Trophy size={18} /> Show Leaderboard
            </button>
          </div>
        </div>

      </div>
    </div>
  )

  // ────────────────────────────────────
  // LEADERBOARD
  // ────────────────────────────────────
  if (phase === 'leaderboard') return (
    <LeaderboardScreen
      leaderboard={leaderboard}
      qIndex={qIndex}
      totalQs={totalQs}
      isLastQ={isLastQ}
      onNext={nextQuestion}
      onEndQuiz={endQuiz}
      isFinished={false}
    />
  )

  // ────────────────────────────────────
  // FINISHED — confetti + winner shown on TV
  // ────────────────────────────────────
  if (phase === 'finished') {
    const winner = leaderboard[0]
    return (
      <>
        <Confetti count={120} />
        {showWinner && winner && (
          <WinnerCelebration winner={winner} onDismiss={() => setShowWinner(false)} />
        )}
        {!showWinner && (
          <LeaderboardScreen
            leaderboard={leaderboard}
            qIndex={qIndex}
            totalQs={totalQs}
            isLastQ={true}
            isFinished={true}
            onEnd={() => navigate('/dashboard')}
            onEndQuiz={endQuiz}
          />
        )}
      </>
    )
  }

  return null
}

// ── Animated leaderboard screen ──
function LeaderboardScreen({ leaderboard, qIndex, totalQs, isLastQ, isFinished, onNext, onEnd, onEndQuiz }) {
  const [displayed, setDisplayed] = useState([])

  useEffect(() => {
    setDisplayed([])
    const timers = leaderboard.map((_, i) =>
      setTimeout(() => setDisplayed(d => [...d, i]), i * 140 + 200)
    )
    return () => timers.forEach(clearTimeout)
  }, [leaderboard])

  const rankLabel = (i) =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

  return (
    <div className="min-h-screen page-bg">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <Trophy size={44} className="mx-auto mb-3" style={{ color: 'var(--accent-gold)' }} />
          <h2 className="font-display font-bold text-[clamp(2rem,5vw,3rem)] text-[var(--ink)]"
            style={{ letterSpacing: '-0.02em' }}>
            {isFinished ? 'Final Results!' : 'Leaderboard'}
          </h2>
          {!isFinished && (
            <p className="text-[var(--slate)] mt-1">After question {qIndex + 1} of {totalQs}</p>
          )}
        </div>

        <div className="space-y-3 mb-8">
          {leaderboard.slice(0, 10).map((p, i) => (
            <div key={`${p.name}-${i}`}
              className={`lb-item rank-${i + 1}`}
              style={{
                opacity: displayed.includes(i) ? 1 : 0,
                transform: displayed.includes(i) ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
                transition: 'all 0.65s cubic-bezier(0.34,1.2,0.64,1)',
                padding: '16px 22px'
              }}>
              <span className="font-bold w-12 text-center flex-shrink-0"
                style={{
                  fontSize: i < 3 ? '1.6rem' : '1.1rem',
                  color: i === 0 ? 'var(--accent-gold)' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : 'var(--slate)'
                }}>
                {rankLabel(i)}
              </span>
              <span className="text-3xl flex-shrink-0">{p.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-xl text-[var(--ink)] truncate">{p.name}</p>
                <p className="text-sm text-[var(--slate)]">
                  {p.correctAnswers}/{p.totalAnswers} correct
                  {p.streak > 1 && ` · 🔥 ${p.streak} streak`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-bold text-2xl text-[var(--ink)]">{p.score.toLocaleString()}</p>
                <p className="text-xs text-[var(--slate)]">pts</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          {!isFinished ? (
            <>
              <button onClick={onEndQuiz} className="btn-ghost gap-1.5 text-sm" style={{ color: 'var(--accent-coral)' }}>
                <StopCircle size={15} /> End Quiz
              </button>
              <button onClick={onNext} className="btn-primary gap-2 py-3.5 px-10 text-base">
                {isLastQ ? 'Finish Quiz' : 'Next Question'}
                <ChevronRight size={18} />
              </button>
            </>
          ) : (
            <button onClick={onEnd} className="btn-primary gap-2 py-3.5 px-10 text-base">
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
