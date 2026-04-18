import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Play, SkipForward, Trophy, Zap, Copy, ChevronRight, BarChart2, Clock, X } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import toast from 'react-hot-toast'

const ANSWER_COLORS = [
  'from-blue-600/30 to-blue-500/20 border-blue-400/40',
  'from-purple-600/30 to-purple-500/20 border-purple-400/40',
  'from-amber-600/30 to-amber-500/20 border-amber-400/40',
  'from-rose-600/30 to-rose-500/20 border-rose-400/40'
]

export default function HostSessionPage() {
  const { sessionCode } = useParams()
  const { socket } = useSocket()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('lobby') // lobby | question | results | leaderboard | finished
  const [session, setSession] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [participants, setParticipants] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [answerUpdate, setAnswerUpdate] = useState({ answerCount: 0, totalParticipants: 0 })
  const [questionResults, setQuestionResults] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [answerStats, setAnswerStats] = useState({})
  const timerRef = useRef(null)

  useEffect(() => {
    if (!socket) return
    socket.emit('host:join_session', { sessionCode })

    socket.on('host:session_ready', ({ session: s, quiz: q, participants: p }) => {
      setSession(s)
      setQuiz(q)
      setParticipants(p || [])
      setTotalQuestions(q?.questions?.length || 0)
    })

    socket.on('participants:updated', ({ participants: p }) => setParticipants(p))

    socket.on('question:start_host', ({ question, questionIndex: qi, totalQuestions: tq, startTime }) => {
      setCurrentQuestion(question)
      setQuestionIndex(qi)
      setTotalQuestions(tq)
      setPhase('question')
      setAnswerUpdate({ answerCount: 0, totalParticipants: participants.length })
      setAnswerStats({})

      const start = new Date(startTime)
      const total = question.timeLimit
      const tick = () => {
        const elapsed = (Date.now() - start.getTime()) / 1000
        const remaining = Math.max(0, total - elapsed)
        setTimeLeft(Math.ceil(remaining))
        if (remaining > 0) timerRef.current = setTimeout(tick, 200)
      }
      tick()
    })

    socket.on('host:answer_update', (data) => setAnswerUpdate(data))

    socket.on('question:ended', ({ correctAnswerId, answerStats: stats, totalAnswers, explanation }) => {
      clearTimeout(timerRef.current)
      setPhase('results')
      setAnswerStats(stats)
      setQuestionResults({ correctAnswerId, totalAnswers, explanation })
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
      socket.off('host:session_ready')
      socket.off('participants:updated')
      socket.off('question:start_host')
      socket.off('host:answer_update')
      socket.off('question:ended')
      socket.off('leaderboard:show')
      socket.off('quiz:finished')
      socket.off('error')
      clearTimeout(timerRef.current)
    }
  }, [socket, sessionCode])

  const startQuiz = () => socket?.emit('host:start_quiz', { sessionCode })
  const nextQuestion = () => socket?.emit('host:next_question', { sessionCode })
  const endQuestion = () => socket?.emit('host:end_question', { sessionCode })
  const showLeaderboard = () => socket?.emit('host:show_leaderboard', { sessionCode })
  const copyCode = () => { navigator.clipboard.writeText(sessionCode); toast.success('Code copied!') }

  const progressPct = currentQuestion ? (timeLeft / currentQuestion.timeLimit) * 100 : 100

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-navy-300">Connecting to session...</p>
      </div>
    </div>
  )

  // ──────────────────────────────────────────
  // LOBBY
  // ──────────────────────────────────────────
  if (phase === 'lobby') return (
    <div className="min-h-screen grid-bg p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-electric-blue rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-navy-950" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-lg">PeersQ Host</span>
          </div>
          <span className="text-navy-400 text-sm">{quiz?.title}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Code + QR */}
          <div className="card text-center">
            <p className="text-navy-400 text-sm mb-3">Share this code to join</p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="font-mono font-bold text-5xl text-white tracking-widest glow-text">
                {sessionCode}
              </span>
              <button onClick={copyCode} className="glass p-2 rounded-xl text-electric-blue hover:border-electric-blue/40 transition-all">
                <Copy size={18} />
              </button>
            </div>
            <p className="text-navy-400 text-xs mb-4">or go to <span className="text-electric-blue">{window.location.host}/join</span></p>
            {session.qrCode && (
              <div className="inline-block bg-white p-3 rounded-2xl">
                <img src={session.qrCode} alt="QR Code" className="w-40 h-40" />
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-electric-blue" />
                <span className="font-display font-semibold text-white">{participants.length} Joined</span>
              </div>
              <span className="text-navy-400 text-sm">max 50</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-56 space-y-2 pr-1">
              {participants.length === 0 ? (
                <div className="text-center py-8 text-navy-400 text-sm">
                  Waiting for participants to join...
                </div>
              ) : (
                participants.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 glass rounded-xl p-2.5 animate-slide-in">
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="text-white font-medium text-sm">{p.name}</span>
                    {i === participants.length - 1 && (
                      <span className="ml-auto text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">NEW</span>
                    )}
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => { startQuiz(); nextQuestion() }}
              disabled={participants.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 mt-4 text-base disabled:opacity-40"
            >
              <Play size={20} /> Start Quiz ({quiz?.questions?.length} questions)
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ──────────────────────────────────────────
  // ACTIVE QUESTION
  // ──────────────────────────────────────────
  if (phase === 'question' && currentQuestion) return (
    <div className="min-h-screen grid-bg p-4">
      <div className="max-w-5xl mx-auto">
        {/* Progress bar */}
        <div className="h-1 bg-navy-800 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-electric-blue transition-all duration-200 rounded-full"
            style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flex items-center justify-between mb-4 text-sm text-navy-400">
          <span>Question {questionIndex + 1} / {totalQuestions}</span>
          <div className="flex items-center gap-2">
            <span>{answerUpdate.answerCount}/{answerUpdate.totalParticipants} answered</span>
            <div className={`flex items-center gap-1 font-mono text-xl font-bold ${
              timeLeft <= 5 ? 'text-accent-coral' : 'text-white'
            }`}>
              <Clock size={18} />
              {timeLeft}s
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="card mb-4">
          {currentQuestion.image && (
            <img src={currentQuestion.image} alt="" className="w-full max-h-48 object-cover rounded-xl mb-4" />
          )}
          <h2 className="font-display font-bold text-2xl text-white text-center">{currentQuestion.text}</h2>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {currentQuestion.options.map((opt, i) => (
            <div key={opt.id} className={`p-4 rounded-2xl border bg-gradient-to-br ${ANSWER_COLORS[i]} flex items-center gap-3`}>
              <span className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center font-mono font-bold text-white flex-shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-white font-medium">{opt.text}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <button onClick={endQuestion} className="btn-secondary flex items-center gap-2 py-3">
            <SkipForward size={16} /> End Early
          </button>
        </div>
      </div>
    </div>
  )

  // ──────────────────────────────────────────
  // QUESTION RESULTS
  // ──────────────────────────────────────────
  if (phase === 'results') return (
    <div className="min-h-screen grid-bg p-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display font-bold text-2xl text-white text-center mb-6">Question Results</h2>

        <div className="card mb-4">
          <h3 className="text-white font-medium text-center mb-5">{currentQuestion?.text}</h3>
          <div className="space-y-3">
            {currentQuestion?.options.map((opt, i) => {
              const stat = answerStats[opt.id] || { count: 0 }
              const total = Object.values(answerStats).reduce((s, v) => s + v.count, 0)
              const pct = total > 0 ? Math.round((stat.count / total) * 100) : 0
              const isCorrect = opt.id === questionResults?.correctAnswerId

              return (
                <div key={opt.id} className={`relative rounded-xl overflow-hidden border ${
                  isCorrect ? 'border-green-400/60' : 'border-navy-600/40'
                }`}>
                  <div className={`absolute inset-0 transition-all duration-700 ${
                    isCorrect ? 'bg-green-500/20' : 'bg-navy-700/40'
                  }`} style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center gap-3 p-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isCorrect ? 'bg-green-400 text-navy-950' : 'bg-navy-600 text-navy-300'
                    }`}>{String.fromCharCode(65 + i)}</span>
                    <span className={`flex-1 font-medium ${isCorrect ? 'text-green-300' : 'text-white'}`}>{opt.text}</span>
                    <span className="text-white font-mono text-sm">{stat.count} ({pct}%)</span>
                    {isCorrect && <span className="text-green-400 text-xs">✓ Correct</span>}
                  </div>
                </div>
              )
            })}
          </div>
          {questionResults?.explanation && (
            <div className="mt-4 p-3 bg-electric-blue/10 border border-electric-blue/20 rounded-xl">
              <p className="text-electric-blue text-sm">{questionResults.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3">
          <button onClick={showLeaderboard} className="btn-secondary flex items-center gap-2 py-3 px-6">
            <Trophy size={16} /> Leaderboard
          </button>
          <button onClick={nextQuestion} className="btn-primary flex items-center gap-2 py-3 px-6">
            {questionIndex + 1 >= totalQuestions ? 'Finish' : 'Next Question'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  // ──────────────────────────────────────────
  // LEADERBOARD
  // ──────────────────────────────────────────
  if (phase === 'leaderboard' || phase === 'finished') return (
    <div className="min-h-screen grid-bg p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <Trophy size={40} className="text-accent-gold mx-auto mb-3" />
          <h2 className="font-display font-bold text-3xl text-white">
            {phase === 'finished' ? '🎉 Final Results!' : 'Leaderboard'}
          </h2>
          {phase !== 'finished' && (
            <p className="text-navy-300 mt-1">After question {questionIndex + 1}</p>
          )}
        </div>

        <div className="space-y-2 mb-6">
          {leaderboard.slice(0, 10).map((p, i) => (
            <div key={p.name} className={`leaderboard-item rank-${i + 1} animate-slide-up`}
              style={{ animationDelay: `${i * 0.05}s` }}>
              <span className={`w-8 text-center font-display font-bold text-lg ${
                i === 0 ? 'text-accent-gold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-navy-400'
              }`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="text-2xl">{p.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{p.name}</div>
                <div className="text-xs text-navy-400">{p.correctAnswers}/{p.totalAnswers} correct</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-white">{p.score.toLocaleString()}</div>
                <div className="text-xs text-navy-400">pts</div>
              </div>
            </div>
          ))}
        </div>

        {phase === 'leaderboard' ? (
          <div className="flex justify-center">
            <button onClick={nextQuestion} className="btn-primary flex items-center gap-2 py-3 px-8">
              {questionIndex + 1 >= totalQuestions ? 'End Quiz' : 'Next Question'}
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-secondary py-3 px-6">
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return null
}
