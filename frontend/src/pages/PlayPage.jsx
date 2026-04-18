import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Clock, Trophy, Zap, CheckCircle, XCircle } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import toast from 'react-hot-toast'

const OPT_STYLES = [
  { base: 'opt-a', accent: '#0057FF', bg: 'rgba(0,87,255,0.05)', selectedBg: 'rgba(0,87,255,0.1)', border: '#0057FF', letterBg: '#0057FF' },
  { base: 'opt-b', accent: '#8B5CF6', bg: 'rgba(139,92,246,0.05)', selectedBg: 'rgba(139,92,246,0.1)', border: '#8B5CF6', letterBg: '#8B5CF6' },
  { base: 'opt-c', accent: '#F59E0B', bg: 'rgba(245,158,11,0.05)', selectedBg: 'rgba(245,158,11,0.1)', border: '#F59E0B', letterBg: '#F59E0B' },
  { base: 'opt-d', accent: '#EF4444', bg: 'rgba(239,68,68,0.05)', selectedBg: 'rgba(239,68,68,0.1)', border: '#EF4444', letterBg: '#EF4444' },
]
const LETTERS = ['A', 'B', 'C', 'D']

const CONFETTI_COLORS = ['#0057FF', '#00D4FF', '#FFB800', '#00E87A', '#FF4060', '#8B5CF6']

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    width: `${6 + Math.random() * 8}px`,
    height: `${6 + Math.random() * 10}px`,
    duration: `${2 + Math.random() * 3}s`,
    delay: `${Math.random() * 2}s`,
    rotate: `${Math.random() * 360}deg`
  }))
  return (
    <>
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece"
          style={{
            left: p.left,
            top: '-20px',
            width: p.width,
            height: p.height,
            background: p.color,
            animationDuration: p.duration,
            animationDelay: p.delay,
            transform: `rotate(${p.rotate})`
          }} />
      ))}
    </>
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
  const [selectedAnswers, setSelectedAnswers] = useState([]) // multi-select
  const [answerResult, setAnswerResult] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [totalQs, setTotalQs] = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [myRank, setMyRank] = useState(null)
  const [quizTitle, setQuizTitle] = useState('')
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
      setMyName(name)
      setMyAvatar(avatar)
    })

    socket.on('quiz:started', () => setPhase('waiting'))

    socket.on('question:countdown', ({ seconds, questionIndex, totalQuestions }) => {
      setPhase('countdown')
      setQIndex(questionIndex)
      setTotalQs(totalQuestions)
      let s = seconds
      setCountdown(s)
      clearInterval(countdownRef.current)
      countdownRef.current = setInterval(() => {
        s--
        setCountdown(s)
        if (s <= 0) clearInterval(countdownRef.current)
      }, 1000)
    })

    socket.on('question:start', ({ questionIndex: qi, totalQuestions: tq, startTime, ...q }) => {
      setQuestion(q)
      setQIndex(qi)
      setTotalQs(tq)
      setSelectedAnswer(null)
      setSelectedAnswers([])
      setAnswerResult(null)
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
      setPhase('answered')
      clearTimeout(timerRef.current)
    })

    socket.on('answer:too_late', () => {
      setPhase('answered')
      setAnswerResult({ isCorrect: false, pointsEarned: 0, tooLate: true })
    })

    socket.on('question:ended', ({ correctAnswerId }) => {
      clearTimeout(timerRef.current)
      setAnswerResult(r => r ? { ...r, correctAnswerId } : { isCorrect: false, pointsEarned: 0, correctAnswerId, noAnswer: true })
      setPhase('answered')
    })

    socket.on('leaderboard:show', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      const me = lb.find(p => p.name === myName)
      setMyRank(me?.rank || null)
      setPhase('leaderboard')
    })

    socket.on('quiz:finished', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      const me = lb.find(p => p.name === myName)
      setMyRank(me?.rank || null)
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
    if (selectedAnswer) return
    setSelectedAnswers(prev => {
      const next = prev.includes(answerId) ? prev.filter(x => x !== answerId) : [...prev, answerId]
      // Auto-submit after 1.5s of no changes
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
        <div className="w-14 h-14 border-3 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--paper)', borderTopColor: 'var(--blue-vivid)', borderWidth: 3 }} />
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
        <div className="font-display font-bold text-[9rem] leading-none"
          style={{
            color: 'var(--blue-vivid)',
            textShadow: '0 0 50px rgba(0,87,255,0.25)',
            animation: 'countdownBeat 1s ease-in-out infinite'
          }}
          key={countdown}>
          {countdown}
        </div>
        <p className="text-[var(--slate)] text-lg mt-2">Get ready!</p>
      </div>
    </div>
  )

  // ── ACTIVE QUESTION ──
  if (phase === 'question' && question) return (
    <div className="min-h-screen page-bg flex flex-col px-4 py-4">
      {/* Timer bar */}
      <div className="progress-bar mb-3">
        <div className={`progress-fill ${timerPct < 25 ? 'danger' : ''}`}
          style={{ width: `${timerPct}%` }} />
      </div>

      <div className="flex items-center justify-between text-sm mb-4">
        <span className="font-mono font-semibold" style={{ color: 'var(--slate)' }}>
          {qIndex + 1}/{totalQs}
        </span>
        <div className={`flex items-center gap-1.5 font-mono font-bold text-2xl ${timeLeft <= 5 ? 'anim-countdown-beat' : ''}`}
          style={{ color: timeLeft <= 5 ? 'var(--accent-coral)' : 'var(--ink)' }}>
          <Clock size={20} />
          {timeLeft}
        </div>
        <span className="font-mono font-bold" style={{ color: 'var(--blue-vivid)' }}>
          {score.toLocaleString()} pts
        </span>
      </div>

      {/* Question card */}
      <div className="surface p-5 mb-4 text-center flex-shrink-0">
        {question.image && (
          <img src={question.image} alt="" className="w-full max-h-36 object-cover rounded-2xl mb-3" />
        )}
        <h2 className="font-display font-bold text-xl text-[var(--ink)] leading-tight">
          {question.text}
        </h2>
        {question.type === 'multiple_select' && (
          <p className="text-xs text-[var(--slate)] mt-2">Select all that apply — auto-submits after 1.5s</p>
        )}
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col gap-3">
        {question.options.map((opt, i) => {
          const s = OPT_STYLES[i % OPT_STYLES.length]
          const isSelected = question.type === 'multiple_select'
            ? selectedAnswers.includes(opt.id)
            : selectedAnswer === opt.id
          const isDisabled = question.type !== 'multiple_select'
            ? Boolean(selectedAnswer)
            : selectedAnswer === 'submitted'

          return (
            <button
              key={opt.id}
              onClick={() => question.type === 'multiple_select' ? toggleMultiAnswer(opt.id) : submitAnswer(opt.id)}
              disabled={isDisabled}
              className={`answer-opt ${s.base} ${isSelected ? 'selected' : ''} ${isDisabled && !isSelected ? 'disabled' : ''}`}
              style={{
                borderColor: isSelected ? s.border : 'var(--paper)',
                background: isSelected ? s.selectedBg : 'white',
                opacity: isDisabled && !isSelected ? 0.5 : 1
              }}
            >
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
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

  // ── ANSWERED ──
  if (phase === 'answered') return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4">
      <div className="text-center anim-pop w-full max-w-sm">
        {answerResult?.tooLate ? (
          <>
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="font-display font-bold text-2xl text-[var(--ink)] mb-1">Too slow!</h2>
            <p className="text-[var(--slate)]">Time ran out before you answered</p>
          </>
        ) : answerResult?.noAnswer ? (
          <>
            <div className="text-6xl mb-4">😶</div>
            <h2 className="font-display font-bold text-2xl text-[var(--ink)] mb-1">No answer</h2>
            <p className="text-[var(--slate)]">You didn't answer this one</p>
          </>
        ) : answerResult?.isCorrect ? (
          <>
            <div className="text-6xl mb-4 anim-float">🎯</div>
            <h2 className="font-display font-bold text-3xl mb-3" style={{ color: 'var(--accent-green)' }}>
              Correct!
            </h2>
            <div className="surface p-5 mb-3 inline-block">
              <p className="font-mono font-bold text-4xl" style={{ color: 'var(--blue-vivid)' }}>
                +{answerResult.pointsEarned}
              </p>
              <p className="text-[var(--slate)] text-sm">points earned</p>
            </div>
            <p className="text-sm text-[var(--slate)]">
              {answerResult.timeTaken?.toFixed(1)}s · Total:{' '}
              <span className="font-mono font-bold text-[var(--ink)]">{score.toLocaleString()}</span>
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">😕</div>
            <h2 className="font-display font-bold text-3xl mb-2" style={{ color: 'var(--accent-coral)' }}>
              Not quite
            </h2>
            <p className="text-[var(--slate)] mb-2">That wasn't right this time</p>
            <p className="text-sm text-[var(--slate)]">
              Total: <span className="font-mono font-bold text-[var(--ink)]">{score.toLocaleString()}</span>
            </p>
          </>
        )}

        <div className="flex items-center justify-center gap-2 mt-6 text-[var(--slate)] text-sm">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--blue-vivid)' }} />
          Waiting for next question...
        </div>
      </div>
    </div>
  )

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
  if (phase === 'finished') return (
    <>
      {myRank === 1 && <Confetti />}
      <ParticipantLeaderboard
        leaderboard={leaderboard}
        myName={myName}
        myRank={myRank}
        score={score}
        isFinished={true}
        onPlayAgain={() => navigate('/join')}
      />
    </>
  )

  return null
}

function ParticipantLeaderboard({ leaderboard, myName, myRank, score, isFinished, onPlayAgain }) {
  const [visible, setVisible] = useState([])

  useEffect(() => {
    setVisible([])
    const timers = leaderboard.map((_, i) =>
      setTimeout(() => setVisible(v => [...v, i]), i * 150 + 300)
    )
    return () => timers.forEach(clearTimeout)
  }, [leaderboard])

  const myEntry = leaderboard.find(p => p.name === myName)
  const rankEmoji = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`

  return (
    <div className="min-h-screen page-bg px-4 py-8 flex flex-col items-center">
      {isFinished && myRank === 1 && (
        <div className="anim-pop text-center mb-4">
          <div className="text-5xl mb-1">🏆</div>
          <div className="font-display font-bold text-2xl" style={{ color: 'var(--accent-gold)' }}>
            You won!
          </div>
        </div>
      )}

      <Trophy size={30} className="mb-2" style={{ color: 'var(--accent-gold)' }} />
      <h2 className="font-display font-bold text-2xl text-[var(--ink)] mb-1">
        {isFinished ? 'Final Results' : 'Leaderboard'}
      </h2>
      {myRank && (
        <p className="text-sm text-[var(--slate)] mb-5">
          You're ranked{' '}
          <span className="font-bold" style={{ color: 'var(--blue-vivid)' }}>#{myRank}</span>
          {' '}with{' '}
          <span className="font-mono font-bold text-[var(--ink)]">{score.toLocaleString()} pts</span>
        </p>
      )}

      <div className="w-full max-w-sm space-y-2 mb-6">
        {leaderboard.slice(0, 8).map((p, i) => (
          <div key={p.name}
            className={`lb-item rank-${i + 1} ${p.name === myName ? 'is-me' : ''}`}
            style={{
              opacity: visible.includes(i) ? 1 : 0,
              transform: visible.includes(i) ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.7s cubic-bezier(0.34,1.2,0.64,1)',
              ...(p.name === myName && i === 0 ? { animation: 'winnerGlow 2s ease-in-out infinite' } : {})
            }}>
            <span className="font-bold text-lg w-10 text-center flex-shrink-0"
              style={{ color: i === 0 ? 'var(--accent-gold)' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : 'var(--slate)' }}>
              {rankEmoji(i + 1)}
            </span>
            <span className="text-xl">{p.avatar}</span>
            <span className={`flex-1 font-medium truncate ${p.name === myName ? 'font-bold' : ''}`}
              style={{ color: p.name === myName ? 'var(--blue-vivid)' : 'var(--ink)' }}>
              {p.name} {p.name === myName && '(you)'}
            </span>
            <span className="font-mono font-bold text-sm text-[var(--ink)]">
              {p.score.toLocaleString()}
            </span>
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
