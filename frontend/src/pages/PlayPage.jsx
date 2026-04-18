import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Zap, Trophy, Clock } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import toast from 'react-hot-toast'

const ANSWER_COLORS = [
  { base: 'from-blue-600/20 to-blue-500/10 border-blue-400/30 hover:border-blue-400/60', selected: 'from-blue-600/40 to-blue-500/30 border-blue-400/70', letter: 'bg-blue-500 text-white' },
  { base: 'from-purple-600/20 to-purple-500/10 border-purple-400/30 hover:border-purple-400/60', selected: 'from-purple-600/40 to-purple-500/30 border-purple-400/70', letter: 'bg-purple-500 text-white' },
  { base: 'from-amber-600/20 to-amber-500/10 border-amber-400/30 hover:border-amber-400/60', selected: 'from-amber-600/40 to-amber-500/30 border-amber-400/70', letter: 'bg-amber-500 text-white' },
  { base: 'from-rose-600/20 to-rose-500/10 border-rose-400/30 hover:border-rose-400/60', selected: 'from-rose-600/40 to-rose-500/30 border-rose-400/70', letter: 'bg-rose-500 text-white' }
]

export default function PlayPage() {
  const { sessionCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { socket } = useSocket()

  const { name, avatar } = location.state || {}

  const [phase, setPhase] = useState('joining') // joining | waiting | question | answered | results | leaderboard | finished
  const [question, setQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answerResult, setAnswerResult] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [quizTitle, setQuizTitle] = useState('')
  const [myRank, setMyRank] = useState(null)
  const timerRef = useRef(null)
  const hasJoined = useRef(false)

  useEffect(() => {
    if (!socket || !name || hasJoined.current) return
    hasJoined.current = true

    socket.emit('participant:join', { sessionCode, name, avatar })

    socket.on('participant:joined', ({ session }) => {
      setPhase('waiting')
      setQuizTitle(session.quizTitle || 'Quiz')
    })

    socket.on('quiz:started', () => setPhase('waiting'))

    socket.on('question:start', ({ questionIndex: qi, totalQuestions: tq, startTime, ...q }) => {
      setQuestion(q)
      setQuestionIndex(qi)
      setTotalQuestions(tq)
      setSelectedAnswer(null)
      setAnswerResult(null)
      setPhase('question')

      const start = new Date(startTime)
      const total = q.timeLimit
      const tick = () => {
        const elapsed = (Date.now() - start.getTime()) / 1000
        const remaining = Math.max(0, total - elapsed)
        setTimeLeft(Math.ceil(remaining))
        if (remaining > 0) timerRef.current = setTimeout(tick, 200)
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
      setAnswerResult({ isCorrect: false, pointsEarned: 0, timeTaken: 0, correctAnswerId: null, tooLate: true })
    })

    socket.on('question:ended', ({ correctAnswerId, explanation }) => {
      if (phase !== 'answered') {
        setAnswerResult(r => r ? { ...r, correctAnswerId } : { isCorrect: false, pointsEarned: 0, correctAnswerId, timeTaken: 0, noAnswer: true })
        setPhase('answered')
      }
      clearTimeout(timerRef.current)
    })

    socket.on('leaderboard:show', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      const myEntry = lb.find(p => p.name === name)
      setMyRank(myEntry?.rank || null)
      setPhase('leaderboard')
    })

    socket.on('quiz:finished', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      const myEntry = lb.find(p => p.name === name)
      setMyRank(myEntry?.rank || null)
      setPhase('finished')
    })

    socket.on('participant:kicked', () => {
      toast.error('You were removed from the session')
      navigate('/join')
    })

    socket.on('error', ({ message }) => toast.error(message))

    return () => {
      socket.off('participant:joined')
      socket.off('quiz:started')
      socket.off('question:start')
      socket.off('answer:received')
      socket.off('answer:too_late')
      socket.off('question:ended')
      socket.off('leaderboard:show')
      socket.off('quiz:finished')
      socket.off('participant:kicked')
      socket.off('error')
      clearTimeout(timerRef.current)
    }
  }, [socket, name, sessionCode])

  const submitAnswer = (answerId) => {
    if (selectedAnswer || !question) return
    setSelectedAnswer(answerId)
    socket?.emit('participant:answer', {
      sessionCode,
      questionId: question.id,
      answerId
    })
  }

  if (!name) {
    navigate(`/join/${sessionCode}`)
    return null
  }

  const timerPct = question ? (timeLeft / question.timeLimit) * 100 : 100

  // ─── JOINING ───
  if (phase === 'joining') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-medium">Joining session...</p>
      </div>
    </div>
  )

  // ─── WAITING ───
  if (phase === 'waiting') return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      <div className="text-center animate-slide-up">
        <div className="text-7xl mb-4 animate-float">{avatar}</div>
        <h2 className="font-display font-bold text-3xl text-white mb-2">{name}</h2>
        <p className="text-navy-300 mb-6">{quizTitle}</p>
        <div className="glass rounded-2xl px-8 py-4 inline-flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white">Waiting for host to start...</span>
        </div>
        <p className="text-navy-400 text-sm mt-4">Score: <span className="text-white font-mono">{score}</span></p>
      </div>
    </div>
  )

  // ─── ACTIVE QUESTION ───
  if (phase === 'question' && question) return (
    <div className="min-h-screen grid-bg flex flex-col p-4">
      {/* Timer bar */}
      <div className="h-1.5 bg-navy-800 rounded-full mb-4 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-200 ${
          timeLeft <= 5 ? 'bg-accent-coral' : 'bg-electric-blue'
        }`} style={{ width: `${timerPct}%` }} />
      </div>

      <div className="flex items-center justify-between text-sm text-navy-400 mb-4">
        <span className="font-mono">{questionIndex + 1}/{totalQuestions}</span>
        <div className={`flex items-center gap-1 font-mono font-bold text-xl ${
          timeLeft <= 5 ? 'text-accent-coral' : 'text-white'
        }`}>
          <Clock size={18} />
          {timeLeft}
        </div>
        <span className="font-mono">{score} pts</span>
      </div>

      {/* Question */}
      <div className="card mb-4 text-center flex-shrink-0">
        {question.image && (
          <img src={question.image} alt="" className="w-full max-h-40 object-cover rounded-xl mb-3" />
        )}
        <p className="font-display font-bold text-xl text-white leading-tight">{question.text}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3 flex-1">
        {question.options.map((opt, i) => {
          const colors = ANSWER_COLORS[i]
          const isSelected = selectedAnswer === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => submitAnswer(opt.id)}
              disabled={!!selectedAnswer}
              className={`answer-option flex items-center gap-4 bg-gradient-to-br border text-left transition-all duration-200 active:scale-[0.98] ${
                isSelected ? colors.selected : colors.base
              } ${selectedAnswer && !isSelected ? 'opacity-50' : ''}`}
            >
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold flex-shrink-0 ${
                isSelected ? colors.letter : 'bg-white/10 text-white'
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-white font-medium">{opt.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ─── ANSWERED ───
  if (phase === 'answered') return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      <div className="text-center animate-pop">
        {answerResult?.tooLate ? (
          <>
            <div className="text-7xl mb-4">⏰</div>
            <h2 className="font-display font-bold text-2xl text-white mb-2">Too slow!</h2>
            <p className="text-navy-300">Time ran out</p>
          </>
        ) : answerResult?.noAnswer ? (
          <>
            <div className="text-7xl mb-4">😅</div>
            <h2 className="font-display font-bold text-2xl text-white mb-2">No answer</h2>
            <p className="text-navy-300">You didn't answer in time</p>
          </>
        ) : answerResult?.isCorrect ? (
          <>
            <div className="text-7xl mb-4 animate-float">🎯</div>
            <h2 className="font-display font-bold text-3xl text-green-400 mb-2">Correct!</h2>
            <div className="glass rounded-2xl px-8 py-4 inline-block mb-3">
              <p className="text-3xl font-mono font-bold text-accent-gold">+{answerResult.pointsEarned}</p>
              <p className="text-navy-300 text-sm">points</p>
            </div>
            <p className="text-navy-300 text-sm">{answerResult.timeTaken?.toFixed(1)}s — Total: {score} pts</p>
          </>
        ) : (
          <>
            <div className="text-7xl mb-4">😕</div>
            <h2 className="font-display font-bold text-3xl text-accent-coral mb-2">Wrong</h2>
            <p className="text-navy-300">No points this round</p>
            <p className="text-navy-400 text-sm mt-2">Total: {score} pts</p>
          </>
        )}
        <div className="mt-6 flex items-center justify-center gap-2 text-navy-400 text-sm">
          <div className="w-2 h-2 bg-electric-blue rounded-full animate-pulse" />
          Waiting for next question...
        </div>
      </div>
    </div>
  )

  // ─── LEADERBOARD ───
  if (phase === 'leaderboard') return (
    <div className="min-h-screen grid-bg p-4 flex flex-col items-center justify-center">
      <Trophy size={36} className="text-accent-gold mb-3" />
      <h2 className="font-display font-bold text-2xl text-white mb-1">Leaderboard</h2>
      {myRank && <p className="text-navy-300 text-sm mb-5">You're ranked <span className="text-electric-blue font-bold">#{myRank}</span></p>}

      <div className="w-full max-w-sm space-y-2">
        {leaderboard.slice(0, 8).map((p, i) => (
          <div key={p.name} className={`leaderboard-item rank-${i + 1} ${p.name === name ? 'ring-1 ring-electric-blue' : ''}`}>
            <span className="w-8 text-center font-bold text-sm text-navy-400">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <span className="text-xl">{p.avatar}</span>
            <span className={`flex-1 font-medium truncate ${p.name === name ? 'text-electric-blue' : 'text-white'}`}>
              {p.name} {p.name === name && '(you)'}
            </span>
            <span className="font-mono font-bold text-white text-sm">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 text-navy-400 text-sm">
        <div className="w-2 h-2 bg-electric-blue rounded-full animate-pulse" />
        Waiting for host...
      </div>
    </div>
  )

  // ─── FINISHED ───
  if (phase === 'finished') return (
    <div className="min-h-screen grid-bg p-4 flex flex-col items-center justify-center">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="font-display font-bold text-3xl text-white mb-1">Quiz Complete!</h2>
      {myRank && <p className="text-electric-blue font-bold text-xl mb-5">You ranked #{myRank}</p>}

      <div className="glass rounded-2xl px-8 py-4 text-center mb-6">
        <p className="text-4xl font-mono font-bold text-accent-gold">{score.toLocaleString()}</p>
        <p className="text-navy-300 text-sm mt-1">Final Score</p>
      </div>

      <div className="w-full max-w-sm space-y-2 mb-6">
        {leaderboard.slice(0, 5).map((p, i) => (
          <div key={p.name} className={`leaderboard-item rank-${i + 1} ${p.name === name ? 'ring-1 ring-electric-blue' : ''}`}>
            <span className="w-8 text-center font-bold">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <span className="text-xl">{p.avatar}</span>
            <span className={`flex-1 font-medium truncate ${p.name === name ? 'text-electric-blue' : 'text-white'}`}>
              {p.name} {p.name === name && '(you)'}
            </span>
            <span className="font-mono font-bold text-white">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/join')} className="btn-primary px-8 py-3">
        Play Another Quiz
      </button>
    </div>
  )

  return null
}
