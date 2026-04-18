import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Clock, Trophy, Zap, CheckCircle } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import toast from 'react-hot-toast'

const OPT_STYLES = [
  { accent: '#0057FF', bg: 'rgba(0,87,255,0.05)', selectedBg: 'rgba(0,87,255,0.1)', border: '#0057FF', letterBg: '#0057FF' },
  { accent: '#8B5CF6', bg: 'rgba(139,92,246,0.05)', selectedBg: 'rgba(139,92,246,0.1)', border: '#8B5CF6', letterBg: '#8B5CF6' },
  { accent: '#F59E0B', bg: 'rgba(245,158,11,0.05)', selectedBg: 'rgba(245,158,11,0.1)', border: '#F59E0B', letterBg: '#F59E0B' },
  { accent: '#EF4444', bg: 'rgba(239,68,68,0.05)', selectedBg: 'rgba(239,68,68,0.1)', border: '#EF4444', letterBg: '#EF4444' },
]
const LETTERS = ['A', 'B', 'C', 'D']
const CONFETTI_COLORS = ['#0057FF', '#00D4FF', '#FFB800', '#00E87A', '#FF4060', '#8B5CF6', '#FF6B6B', '#FFF']

// ── Confetti component ──
function Confetti({ count = 80 }) {
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${Math.random() * 100}%`,
      width: `${6 + Math.random() * 8}px`,
      height: `${8 + Math.random() * 12}px`,
      duration: `${2.5 + Math.random() * 2.5}s`,
      delay: `${Math.random() * 1.5}s`,
      rotate: `${Math.random() * 360}deg`,
      borderRadius: Math.random() > 0.5 ? '50%' : '3px'
    }))
  ).current

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9999 }}>
      {pieces.map(p => (
        <div key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            width: p.width,
            height: p.height,
            background: p.color,
            borderRadius: p.borderRadius,
            animation: `confettiFall ${p.duration} ${p.delay} linear forwards`,
            transform: `rotate(${p.rotate})`
          }} />
      ))}
    </div>
  )
}

// ── Winner spotlight overlay ──
function WinnerCelebration({ name, avatar, score, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4"
      style={{
        zIndex: 1000,
        background: 'rgba(10,15,30,0.85)',
        backdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease'
      }}>
      <div className="text-center"
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.7)',
          transition: 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1)'
        }}>
        {/* Crown */}
        <div className="text-6xl mb-2" style={{ animation: 'float 2s ease-in-out infinite' }}>👑</div>

        {/* Avatar circle */}
        <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-4 text-6xl"
          style={{
            background: 'linear-gradient(135deg,#FFB800,#FF8C00)',
            boxShadow: '0 0 60px rgba(255,184,0,0.6), 0 0 120px rgba(255,184,0,0.3)',
            animation: 'winnerGlow 2s ease-in-out infinite'
          }}>
          {avatar}
        </div>

        {/* Rank badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-sm font-bold"
          style={{ background: 'linear-gradient(135deg,#FFB800,#FF8C00)', color: 'white' }}>
          🏆 WINNER
        </div>

        <h2 className="font-display font-bold text-4xl text-white mb-1"
          style={{ letterSpacing: '-0.02em', textShadow: '0 0 40px rgba(255,184,0,0.5)' }}>
          {name}
        </h2>

        <p className="text-3xl font-mono font-bold mb-1"
          style={{ color: 'var(--accent-gold)' }}>
          {score.toLocaleString()} pts
        </p>
        <p className="text-white/60 text-sm mb-8">Final Score</p>

        <button onClick={onDismiss}
          className="btn-primary gap-2 px-8 py-3.5 text-base"
          style={{ background: 'linear-gradient(135deg,#FFB800,#FF8C00)', boxShadow: '0 8px 30px rgba(255,184,0,0.4)' }}>
          <Zap size={18} fill="white" /> See Leaderboard
        </button>
      </div>
    </div>
  )
}

export default function PlayPage() {
  const { sessionCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const { name: initialName, avatar: initialAvatar } = location.state || {}

  const [phase, setPhase] = useState('joining')
  const [myName, setMyName] = useState(initialName || '')
  const [myAvatar, setMyAvatar] = useState(initialAvatar || '🎯')
  const [question, setQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [selectedAnswers, setSelectedAnswers] = useState([])
  const [answerResult, setAnswerResult] = useState(null)
  const [questionEndData, setQuestionEndData] = useState(null) // correct answer + stats
  const [leaderboard, setLeaderboard] = useState([])
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [totalQs, setTotalQs] = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [myRank, setMyRank] = useState(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [showWinnerCelebration, setShowWinnerCelebration] = useState(false)
  const [isWinner, setIsWinner] = useState(false)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const hasJoined = useRef(false)
  const multiSubmitTimer = useRef(null)

  useEffect(() => {
    if (!socket || !initialName || hasJoined.current) return
    hasJoined.current = true
    socket.emit('participant:join', { sessionCode, name: initialName, avatar: initialAvatar })

    socket.on('participant:joined', ({ session }) => {
      setPhase('waiting')
      setQuizTitle(session?.quizTitle || '')
    })

    socket.on('participant:name_assigned', ({ name, avatar }) => {
      setMyName(name); setMyAvatar(avatar)
    })

    socket.on('quiz:started', () => setPhase('waiting'))

    socket.on('question:countdown', ({ seconds, questionIndex, totalQuestions }) => {
      setPhase('countdown')
      setQIndex(questionIndex)
      setTotalQs(totalQuestions)
      setQuestionEndData(null)
      let s = seconds
      setCountdown(s)
      clearInterval(countdownRef.current)
      countdownRef.current = setInterval(() => {
        s--; setCountdown(s)
        if (s <= 0) clearInterval(countdownRef.current)
      }, 1000)
    })

    socket.on('question:start', ({ questionIndex: qi, totalQuestions: tq, startTime, ...q }) => {
      setQuestion(q)
      setQIndex(qi); setTotalQs(tq)
      setSelectedAnswer(null)
      setSelectedAnswers([])
      setAnswerResult(null)
      setQuestionEndData(null)
      setPhase('question')
      clearTimeout(timerRef.current)
      const start = new Date(startTime)
      const tick = () => {
        const rem = Math.max(0, q.timeLimit - (Date.now() - start) / 1000)
        setTimeLeft(Math.ceil(rem))
        if (rem > 0) timerRef.current = setTimeout(tick, 200)
      }
      tick()
    })

    socket.on('answer:received', ({ isCorrect, pointsEarned, timeTaken, correctAnswerId }) => {
      setScore(s => s + pointsEarned)
      setAnswerResult({ isCorrect, pointsEarned, timeTaken, correctAnswerId })
      // Stay in 'answered' phase — host will advance to leaderboard
      setPhase('answered')
      clearTimeout(timerRef.current)
    })

    socket.on('answer:too_late', () => {
      setPhase('answered')
      setAnswerResult({ isCorrect: false, pointsEarned: 0, tooLate: true })
    })

    // Host ended the question — reveal correct answer + stats to participant
    socket.on('question:ended', ({ correctAnswerId, correctAnswerIds, answerStats, explanation }) => {
      clearTimeout(timerRef.current)
      setQuestionEndData({ correctAnswerId, correctAnswerIds: correctAnswerIds || [correctAnswerId], answerStats, explanation })
      // Update answer result with correct answer info
      setAnswerResult(r => r
        ? { ...r, correctAnswerId }
        : { isCorrect: false, pointsEarned: 0, noAnswer: true, correctAnswerId }
      )
      setPhase('answered')
    })

    // Host clicked "Show Leaderboard" — move everyone to leaderboard
    socket.on('leaderboard:show', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      const me = lb.find(p => p.name === myName)
      setMyRank(me?.rank || null)
      setPhase('leaderboard')
    })

    socket.on('quiz:finished', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      const me = lb.find(p => p.name === myName)
      const rank = me?.rank || null
      setMyRank(rank)
      const won = rank === 1
      setIsWinner(won)
      if (won) {
        setShowWinnerCelebration(true)
      }
      setPhase('finished')
    })

    socket.on('participant:kicked', () => { toast.error('You were removed'); navigate('/join') })
    socket.on('error', ({ message }) => toast.error(message))

    return () => {
      ['participant:joined','participant:name_assigned','quiz:started','question:countdown',
       'question:start','answer:received','answer:too_late','question:ended',
       'leaderboard:show','quiz:finished','participant:kicked','error']
        .forEach(e => socket.off(e))
      clearTimeout(timerRef.current)
      clearInterval(countdownRef.current)
    }
  }, [socket, initialName, sessionCode])

  const submitAnswer = (answerId) => {
    if (selectedAnswer || !question || question.type === 'multiple_select') return
    setSelectedAnswer(answerId)
    socket?.emit('participant:answer', { sessionCode, questionId: question.id, answerId })
  }

  const toggleMultiAnswer = (answerId) => {
    if (selectedAnswer === 'submitted') return
    setSelectedAnswers(prev => {
      const next = prev.includes(answerId) ? prev.filter(x => x !== answerId) : [...prev, answerId]
      clearTimeout(multiSubmitTimer.current)
      multiSubmitTimer.current = setTimeout(() => {
        if (next.length > 0) {
          setSelectedAnswer('submitted')
          socket?.emit('participant:answer', { sessionCode, questionId: question.id, answerIds: next })
        }
      }, 1500)
      return next
    })
  }

  const timerPct = question ? (timeLeft / question.timeLimit) * 100 : 100

  if (!initialName) { navigate(`/join/${sessionCode}`); return null }

  // ── JOINING ──
  if (phase === 'joining') return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full animate-spin mx-auto mb-4"
          style={{ border: '3px solid var(--paper)', borderTopColor: 'var(--blue-vivid)' }} />
        <p className="font-medium text-[var(--ink)]">Joining session...</p>
      </div>
    </div>
  )

  // ── WAITING ──
  if (phase === 'waiting') return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4">
      <div className="text-center anim-fade-up">
        <div className="text-7xl mb-4 anim-float">{myAvatar}</div>
        <h2 className="font-display font-bold text-3xl text-[var(--ink)] mb-1">{myName}</h2>
        {quizTitle && <p className="text-[var(--slate)] mb-6">{quizTitle}</p>}
        <div className="surface inline-flex items-center gap-3 px-6 py-4">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--accent-green)' }} />
          <span className="font-medium text-[var(--ink)]">Waiting for host to start...</span>
        </div>
        <p className="text-sm text-[var(--slate)] mt-4">
          Score: <span className="font-mono font-bold text-[var(--ink)]">{score}</span>
        </p>
      </div>
    </div>
  )

  // ── COUNTDOWN ──
  if (phase === 'countdown') return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center anim-scale-in">
        <p className="text-[var(--slate)] font-semibold uppercase tracking-wider text-sm mb-1">
          Question {qIndex + 1} of {totalQs}
        </p>
        <div key={countdown} className="font-display font-bold leading-none"
          style={{
            fontSize: 'clamp(7rem,20vw,10rem)',
            color: 'var(--blue-vivid)',
            textShadow: '0 0 50px rgba(0,87,255,0.25)',
            animation: 'countdownBeat 1s ease-in-out'
          }}>
          {countdown}
        </div>
        <p className="text-[var(--slate)] text-lg mt-2">Get ready!</p>
      </div>
    </div>
  )

  // ── ACTIVE QUESTION ──
  if (phase === 'question' && question) return (
    <div className="min-h-screen page-bg flex flex-col px-4 py-4">
      <div className="progress-bar mb-3">
        <div className={`progress-fill ${timerPct < 25 ? 'danger' : ''}`} style={{ width: `${timerPct}%` }} />
      </div>
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="font-mono font-semibold text-[var(--slate)]">{qIndex + 1}/{totalQs}</span>
        <div className={`flex items-center gap-1.5 font-mono font-bold text-2xl ${timeLeft <= 5 ? 'anim-countdown-beat' : ''}`}
          style={{ color: timeLeft <= 5 ? 'var(--accent-coral)' : 'var(--ink)' }}>
          <Clock size={20} />{timeLeft}
        </div>
        <span className="font-mono font-bold" style={{ color: 'var(--blue-vivid)' }}>{score.toLocaleString()} pts</span>
      </div>

      <div className="surface p-5 mb-4 text-center flex-shrink-0">
        {question.image && <img src={question.image} alt="" className="w-full max-h-36 object-cover rounded-2xl mb-3" />}
        <h2 className="font-display font-bold text-xl text-[var(--ink)] leading-tight">{question.text}</h2>
        {question.type === 'multiple_select' && (
          <p className="text-xs text-[var(--slate)] mt-2">Select all that apply · auto-submits after 1.5s</p>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {question.options.map((opt, i) => {
          const s = OPT_STYLES[i % OPT_STYLES.length]
          const isSelected = question.type === 'multiple_select'
            ? selectedAnswers.includes(opt.id)
            : selectedAnswer === opt.id
          const isDisabled = question.type !== 'multiple_select' ? Boolean(selectedAnswer) : selectedAnswer === 'submitted'
          return (
            <button key={opt.id}
              onClick={() => question.type === 'multiple_select' ? toggleMultiAnswer(opt.id) : submitAnswer(opt.id)}
              disabled={isDisabled}
              className={`answer-opt ${isSelected ? 'selected' : ''} ${isDisabled && !isSelected ? 'disabled' : ''}`}
              style={{
                borderColor: isSelected ? s.border : 'var(--paper)',
                background: isSelected ? s.selectedBg : 'white',
                opacity: isDisabled && !isSelected ? 0.5 : 1
              }}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: isSelected ? s.letterBg : 'var(--paper)', color: isSelected ? 'white' : 'var(--slate)' }}>
                {LETTERS[i]}
              </span>
              <span className="font-medium text-[var(--ink)] text-left">{opt.text}</span>
              {isSelected && question.type === 'multiple_select' && (
                <CheckCircle size={18} className="ml-auto flex-shrink-0" style={{ color: s.accent }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── ANSWERED — show result + reveal correct answer + stats, wait for host ──
  if (phase === 'answered') {
    const correctIds = questionEndData?.correctAnswerIds || (answerResult?.correctAnswerId ? [answerResult.correctAnswerId] : [])

    return (
      <div className="min-h-screen page-bg flex flex-col px-4 py-5 overflow-y-auto">
        {/* Score feedback */}
        <div className={`surface p-5 mb-4 text-center anim-pop flex-shrink-0`}>
          {answerResult?.tooLate ? (
            <>
              <div className="text-5xl mb-2">⏰</div>
              <h2 className="font-display font-bold text-xl text-[var(--ink)]">Too slow!</h2>
              <p className="text-[var(--slate)] text-sm">Time ran out</p>
            </>
          ) : answerResult?.noAnswer ? (
            <>
              <div className="text-5xl mb-2">😶</div>
              <h2 className="font-display font-bold text-xl text-[var(--ink)]">No answer</h2>
              <p className="text-[var(--slate)] text-sm">You didn't answer this one</p>
            </>
          ) : answerResult?.isCorrect ? (
            <>
              <div className="text-5xl mb-2 anim-float">🎯</div>
              <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--accent-green)' }}>Correct!</h2>
              <div className="inline-block px-5 py-2 rounded-2xl mb-1"
                style={{ background: 'rgba(0,87,255,0.07)' }}>
                <span className="font-mono font-bold text-3xl" style={{ color: 'var(--blue-vivid)' }}>
                  +{answerResult.pointsEarned}
                </span>
                <span className="text-[var(--slate)] text-sm ml-1">pts</span>
              </div>
              <p className="text-xs text-[var(--slate)]">{answerResult.timeTaken?.toFixed(1)}s · Total: {score.toLocaleString()}</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-2">😕</div>
              <h2 className="font-display font-bold text-2xl mb-1" style={{ color: 'var(--accent-coral)' }}>Not quite</h2>
              <p className="text-sm text-[var(--slate)]">Total: {score.toLocaleString()} pts</p>
            </>
          )}
        </div>

        {/* Correct answer reveal + bar chart — shown once host ends question */}
        {questionEndData && (
          <div className="surface p-4 mb-4 anim-fade-up flex-shrink-0">
            <p className="text-xs font-semibold text-[var(--slate)] uppercase tracking-wider mb-3">Answer Breakdown</p>
            <div className="space-y-2.5">
              {question?.options.map((opt, i) => {
                const stat = questionEndData.answerStats?.[opt.id] || { count: 0 }
                const total = Object.values(questionEndData.answerStats || {}).reduce((s, v) => s + v.count, 0)
                const pct = total > 0 ? Math.round((stat.count / total) * 100) : 0
                const isCorrect = correctIds.includes(opt.id)
                const wasMine = selectedAnswer === opt.id || selectedAnswers.includes(opt.id)
                const s = OPT_STYLES[i % OPT_STYLES.length]

                return (
                  <div key={opt.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: isCorrect ? 'var(--accent-green)' : s.accent }}>
                        {LETTERS[i]}
                      </span>
                      <span className="flex-1 text-xs font-medium text-[var(--ink)] truncate">{opt.text}</span>
                      <span className="text-xs font-mono text-[var(--slate)]">{pct}%</span>
                      {isCorrect && <span className="text-xs font-bold" style={{ color: 'var(--accent-green)' }}>✓</span>}
                      {wasMine && !isCorrect && <span className="text-xs" style={{ color: 'var(--accent-coral)' }}>← you</span>}
                      {wasMine && isCorrect && <span className="text-xs font-bold" style={{ color: 'var(--accent-green)' }}>← you ✓</span>}
                    </div>
                    <div className="h-2 rounded-full overflow-hidden ml-8"
                      style={{ background: 'var(--paper)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: isCorrect
                            ? 'linear-gradient(90deg,var(--accent-green),#00C06A)'
                            : `${s.accent}88`
                        }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Explanation */}
            {questionEndData.explanation && (
              <div className="mt-3 p-3 rounded-xl flex gap-2"
                style={{ background: 'rgba(0,87,255,0.05)', border: '1px solid rgba(0,87,255,0.1)' }}>
                <span className="text-base flex-shrink-0">💡</span>
                <p className="text-xs text-[var(--ink)] leading-relaxed">{questionEndData.explanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Waiting indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--slate)] py-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--blue-vivid)' }} />
          Waiting for host to continue...
        </div>
      </div>
    )
  }

  // ── LEADERBOARD ──
  if (phase === 'leaderboard') return (
    <ParticipantLeaderboard
      leaderboard={leaderboard}
      myName={myName}
      myRank={myRank}
      score={score}
      isFinished={false}
    />
  )

  // ── FINISHED ──
  if (phase === 'finished') {
    const winner = leaderboard[0]
    const isMe = myRank === 1

    return (
      <>
        {/* Confetti for everyone on finished — extra for winner */}
        <Confetti count={isMe ? 120 : 40} />

        {/* Winner celebration overlay — only for rank 1 */}
        {isMe && showWinnerCelebration && (
          <WinnerCelebration
            name={myName}
            avatar={myAvatar}
            score={score}
            onDismiss={() => setShowWinnerCelebration(false)}
          />
        )}

        {/* Background leaderboard (visible after dismissing celebration) */}
        {(!isMe || !showWinnerCelebration) && (
          <ParticipantLeaderboard
            leaderboard={leaderboard}
            myName={myName}
            myRank={myRank}
            score={score}
            isFinished={true}
            onPlayAgain={() => navigate('/join')}
            winner={winner}
          />
        )}
      </>
    )
  }

  return null
}

// ── Participant leaderboard screen ──
function ParticipantLeaderboard({ leaderboard, myName, myRank, score, isFinished, onPlayAgain, winner }) {
  const [visible, setVisible] = useState([])

  useEffect(() => {
    setVisible([])
    const timers = leaderboard.map((_, i) =>
      setTimeout(() => setVisible(v => [...v, i]), i * 150 + 300)
    )
    return () => timers.forEach(clearTimeout)
  }, [leaderboard])

  const rankLabel = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

  return (
    <div className="min-h-screen page-bg px-4 py-8 flex flex-col items-center">
      {/* Winner highlight banner at top (for non-winners) */}
      {isFinished && winner && myRank !== 1 && (
        <div className="w-full max-w-sm mb-4 p-4 rounded-2xl text-center anim-pop"
          style={{
            background: 'linear-gradient(135deg,#FFFBEB,#FFF8E0)',
            border: '2px solid rgba(255,184,0,0.4)'
          }}>
          <span className="text-3xl">{winner.avatar}</span>
          <p className="font-display font-bold text-base text-[var(--ink)] mt-1">
            🏆 {winner.name} wins!
          </p>
          <p className="font-mono font-bold text-sm" style={{ color: 'var(--accent-gold)' }}>
            {winner.score.toLocaleString()} pts
          </p>
        </div>
      )}

      <Trophy size={30} className="mb-2" style={{ color: 'var(--accent-gold)' }} />
      <h2 className="font-display font-bold text-2xl text-[var(--ink)] mb-1">
        {isFinished ? 'Final Results' : 'Leaderboard'}
      </h2>
      {myRank && (
        <p className="text-sm text-[var(--slate)] mb-5">
          You ranked{' '}
          <span className="font-bold" style={{ color: 'var(--blue-vivid)' }}>#{myRank}</span>
          {' · '}
          <span className="font-mono font-bold text-[var(--ink)]">{score.toLocaleString()} pts</span>
        </p>
      )}

      <div className="w-full max-w-sm space-y-2 mb-6">
        {leaderboard.slice(0, 8).map((p, i) => (
          <div key={`${p.name}-${i}`}
            className={`lb-item rank-${i + 1} ${p.name === myName ? 'is-me' : ''}`}
            style={{
              opacity: visible.includes(i) ? 1 : 0,
              transform: visible.includes(i) ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.96)',
              transition: 'all 0.7s cubic-bezier(0.34,1.2,0.64,1)',
              ...(p.name === myName && i === 0 && isFinished ? { animation: 'winnerGlow 2s ease-in-out infinite' } : {})
            }}>
            <span className="font-bold text-lg w-10 text-center flex-shrink-0"
              style={{
                color: i === 0 ? 'var(--accent-gold)'
                  : i === 1 ? '#94A3B8'
                  : i === 2 ? '#CD7F32'
                  : 'var(--slate)'
              }}>
              {rankLabel(i)}
            </span>
            <span className="text-xl">{p.avatar}</span>
            <span className={`flex-1 font-medium truncate ${p.name === myName ? 'font-bold' : ''}`}
              style={{ color: p.name === myName ? 'var(--blue-vivid)' : 'var(--ink)' }}>
              {p.name}
              {p.name === myName && <span className="text-xs ml-1 opacity-60">(you)</span>}
            </span>
            <span className="font-mono font-bold text-sm text-[var(--ink)]">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {isFinished ? (
        <button onClick={onPlayAgain} className="btn-primary gap-2 px-8 py-3">
          <Zap size={16} fill="white" /> Play Another Quiz
        </button>
      ) : (
        <div className="flex items-center gap-2 text-sm text-[var(--slate)]">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--blue-vivid)' }} />
          Waiting for host...
        </div>
      )}
    </div>
  )
}
