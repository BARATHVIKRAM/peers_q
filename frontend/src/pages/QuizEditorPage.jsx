import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  Plus, Trash2, Save, ArrowLeft, Upload, Sparkles, Image,
  ChevronUp, ChevronDown, Check, X, Clock, Star, Eye
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import api from '../utils/api'
import toast from 'react-hot-toast'

const OPTION_COLORS = ['bg-blue-500/20 border-blue-400/40', 'bg-purple-500/20 border-purple-400/40', 'bg-amber-500/20 border-amber-400/40', 'bg-rose-500/20 border-rose-400/40']
const OPTION_LETTERS = ['A', 'B', 'C', 'D']

const defaultQuestion = () => ({
  id: uuidv4(),
  type: 'multiple_choice',
  text: '',
  image: '',
  options: [
    { id: uuidv4(), text: '', isCorrect: false },
    { id: uuidv4(), text: '', isCorrect: false },
    { id: uuidv4(), text: '', isCorrect: false },
    { id: uuidv4(), text: '', isCorrect: false }
  ],
  timeLimit: 30,
  points: 100,
  explanation: ''
})

export default function QuizEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [quiz, setQuiz] = useState({ title: '', description: '', questions: [] })
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiSettings, setAiSettings] = useState({ questionCount: 10, difficulty: 'medium' })

  useEffect(() => {
    if (isEdit) {
      api.get(`/quiz/${id}`).then(r => {
        setQuiz(r.data.quiz)
        setActiveQuestion(0)
      }).catch(() => toast.error('Failed to load quiz'))
    } else {
      setQuiz({ title: 'Untitled Quiz', description: '', questions: [defaultQuestion()] })
    }
  }, [id])

  const currentQ = quiz.questions[activeQuestion]

  const updateCurrentQ = (updates) => {
    setQuiz(q => ({
      ...q,
      questions: q.questions.map((question, i) =>
        i === activeQuestion ? { ...question, ...updates } : question
      )
    }))
  }

  const updateOption = (optIdx, updates) => {
    updateCurrentQ({
      options: currentQ.options.map((o, i) => i === optIdx ? { ...o, ...updates } : o)
    })
  }

  const setCorrectAnswer = (optIdx) => {
    updateCurrentQ({
      options: currentQ.options.map((o, i) => ({ ...o, isCorrect: i === optIdx }))
    })
  }

  const addQuestion = () => {
    const newQ = defaultQuestion()
    setQuiz(q => ({ ...q, questions: [...q.questions, newQ] }))
    setActiveQuestion(quiz.questions.length)
  }

  const deleteQuestion = (idx) => {
    if (quiz.questions.length === 1) return toast.error("Can't delete the only question")
    setQuiz(q => ({ ...q, questions: q.questions.filter((_, i) => i !== idx) }))
    setActiveQuestion(Math.max(0, activeQuestion - 1))
  }

  const moveQuestion = (idx, dir) => {
    const qs = [...quiz.questions]
    const target = idx + dir
    if (target < 0 || target >= qs.length) return
    ;[qs[idx], qs[target]] = [qs[target], qs[idx]]
    setQuiz(q => ({ ...q, questions: qs }))
    setActiveQuestion(target)
  }

  const handleAiUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAiLoading(true)
    setShowAiPanel(false)
    toast.loading('Generating questions with AI...', { id: 'ai-gen' })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('questionCount', aiSettings.questionCount)
      formData.append('difficulty', aiSettings.difficulty)

      const { data } = await api.post('/upload/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setQuiz(q => ({
        ...q,
        title: q.title === 'Untitled Quiz' ? `Quiz from ${data.fileName}` : q.title,
        questions: [...q.questions.filter(x => x.text), ...data.questions]
      }))
      setActiveQuestion(0)
      toast.success(`Generated ${data.questionCount} questions!`, { id: 'ai-gen' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed', { id: 'ai-gen' })
    } finally {
      setAiLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      updateCurrentQ({ image: data.imageUrl })
      toast.success('Image uploaded')
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!quiz.title.trim()) return toast.error('Quiz needs a title')
    const validQs = quiz.questions.filter(q => q.text.trim())
    if (validQs.length === 0) return toast.error('Add at least one question')

    // Validate each question has a correct answer
    for (const q of validQs) {
      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (!q.options.some(o => o.isCorrect)) {
          toast.error(`Question "${q.text.substring(0, 30)}..." needs a correct answer`)
          return
        }
      }
    }

    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/quiz/${id}`, { ...quiz, questions: validQs })
      } else {
        const { data } = await api.post('/quiz', { ...quiz, questions: validQs })
        navigate(`/quiz/${data.quiz._id}/edit`, { replace: true })
      }
      toast.success('Quiz saved!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!currentQ) return null

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Top bar */}
      <header className="glass-strong border-b border-navy-700/50 sticky top-0 z-20">
        <div className="flex items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="text-navy-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <input
            value={quiz.title}
            onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))}
            className="flex-1 bg-transparent text-white font-display font-semibold text-lg focus:outline-none placeholder-navy-500"
            placeholder="Quiz title..."
          />
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowAiPanel(!showAiPanel)}
                className="flex items-center gap-2 glass px-3 py-2 rounded-xl text-electric-blue hover:border-electric-blue/40 transition-all text-sm font-medium">
                <Sparkles size={16} />
                <span className="hidden sm:inline">AI Generate</span>
              </button>
              {showAiPanel && (
                <div className="absolute right-0 top-12 w-72 glass-strong rounded-2xl p-4 z-30 border border-navy-600/50 shadow-2xl">
                  <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-electric-blue" />
                    AI Quiz Generator
                  </h3>
                  <div className="space-y-3 mb-3">
                    <div>
                      <label className="text-xs text-navy-300 mb-1 block">Questions to generate</label>
                      <input type="number" min="3" max="20" value={aiSettings.questionCount}
                        onChange={e => setAiSettings(s => ({ ...s, questionCount: parseInt(e.target.value) }))}
                        className="input-field text-sm py-2" />
                    </div>
                    <div>
                      <label className="text-xs text-navy-300 mb-1 block">Difficulty</label>
                      <select value={aiSettings.difficulty}
                        onChange={e => setAiSettings(s => ({ ...s, difficulty: e.target.value }))}
                        className="input-field text-sm py-2 bg-navy-800">
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <label className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5 cursor-pointer">
                    <Upload size={16} />
                    Upload PDF / TXT
                    <input type="file" accept=".pdf,.txt,.md" onChange={handleAiUpload} className="hidden" disabled={aiLoading} />
                  </label>
                  <p className="text-xs text-navy-400 mt-2 text-center">PDF, TXT, or Markdown up to 10MB</p>
                </div>
              )}
            </div>
            <button onClick={save} disabled={saving}
              className="btn-primary flex items-center gap-2 py-2 px-4 text-sm disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
              Save
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - question list */}
        <aside className="w-64 glass-strong border-r border-navy-700/50 overflow-y-auto hidden md:flex flex-col">
          <div className="p-3 flex-1">
            <div className="text-xs text-navy-400 font-medium uppercase tracking-wider px-2 mb-2">
              {quiz.questions.length} Question{quiz.questions.length !== 1 ? 's' : ''}
            </div>
            {quiz.questions.map((q, idx) => (
              <div key={q.id}
                onClick={() => setActiveQuestion(idx)}
                className={`group relative p-3 rounded-xl mb-1 cursor-pointer transition-all ${
                  idx === activeQuestion
                    ? 'bg-electric-blue/15 border border-electric-blue/30'
                    : 'hover:bg-navy-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 ${
                    idx === activeQuestion ? 'bg-electric-blue text-navy-950' : 'bg-navy-700 text-navy-300'
                  }`}>{idx + 1}</span>
                  <span className="text-sm text-white line-clamp-2 flex-1">
                    {q.text || <span className="text-navy-500 italic">Empty question</span>}
                  </span>
                </div>
                {q.options.some(o => o.isCorrect) && (
                  <div className="absolute top-2 right-2">
                    <Check size={12} className="text-green-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-navy-700/50">
            <button onClick={addQuestion} className="w-full flex items-center justify-center gap-2 py-2.5 glass rounded-xl text-electric-blue hover:border-electric-blue/40 transition-all text-sm font-medium">
              <Plus size={16} /> Add Question
            </button>
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-y-auto p-6">
          {aiLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-16 h-16 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-white font-display font-semibold text-lg">AI is generating your questions...</p>
              <p className="text-navy-300 text-sm">This may take 15-30 seconds</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Question header */}
              <div className="flex items-center justify-between">
                <span className="text-navy-400 text-sm font-mono">Question {activeQuestion + 1} of {quiz.questions.length}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveQuestion(activeQuestion, -1)} disabled={activeQuestion === 0}
                    className="p-1.5 glass rounded-lg text-navy-400 hover:text-white disabled:opacity-30 transition-all">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => moveQuestion(activeQuestion, 1)} disabled={activeQuestion === quiz.questions.length - 1}
                    className="p-1.5 glass rounded-lg text-navy-400 hover:text-white disabled:opacity-30 transition-all">
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => deleteQuestion(activeQuestion)}
                    className="p-1.5 glass rounded-lg text-navy-400 hover:text-accent-coral transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Question text */}
              <div className="card">
                <textarea
                  value={currentQ.text}
                  onChange={e => updateCurrentQ({ text: e.target.value })}
                  className="input-field resize-none text-lg font-medium min-h-[80px]"
                  placeholder="Type your question here..."
                  rows={3}
                />
              </div>

              {/* Image */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-navy-300">Question Image (optional)</span>
                  {currentQ.image && (
                    <button onClick={() => updateCurrentQ({ image: '' })}
                      className="text-accent-coral hover:text-red-400 transition-colors">
                      <X size={16} />
                    </button>
                  )}
                </div>
                {currentQ.image ? (
                  <img src={currentQ.image} alt="Question" className="w-full h-40 object-cover rounded-xl" />
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-navy-600 rounded-xl cursor-pointer hover:border-electric-blue/50 transition-all group">
                    <Image size={20} className="text-navy-500 group-hover:text-electric-blue transition-colors mb-1" />
                    <span className="text-xs text-navy-400">Click to upload image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              {/* Options */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-navy-300">Answer Options</span>
                  <span className="text-xs text-navy-400">Click ✓ to mark correct</span>
                </div>
                <div className="space-y-3">
                  {currentQ.options.map((opt, i) => (
                    <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      opt.isCorrect
                        ? 'bg-green-500/10 border-green-400/40'
                        : OPTION_COLORS[i]
                    }`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        opt.isCorrect ? 'bg-green-400 text-navy-950' : 'bg-navy-700 text-navy-300'
                      }`}>{OPTION_LETTERS[i]}</span>
                      <input
                        value={opt.text}
                        onChange={e => updateOption(i, { text: e.target.value })}
                        className="flex-1 bg-transparent text-white placeholder-navy-500 focus:outline-none text-sm"
                        placeholder={`Option ${OPTION_LETTERS[i]}...`}
                      />
                      <button onClick={() => setCorrectAnswer(i)}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          opt.isCorrect
                            ? 'border-green-400 bg-green-400 text-navy-950'
                            : 'border-navy-600 hover:border-green-400 text-transparent hover:text-green-400'
                        }`}>
                        <Check size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-electric-blue" />
                    <span className="text-xs text-navy-300 font-medium">Time Limit</span>
                  </div>
                  <select value={currentQ.timeLimit}
                    onChange={e => updateCurrentQ({ timeLimit: parseInt(e.target.value) })}
                    className="input-field text-sm py-2 bg-navy-800">
                    {[10, 15, 20, 30, 45, 60, 90, 120].map(t => (
                      <option key={t} value={t}>{t}s</option>
                    ))}
                  </select>
                </div>
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={14} className="text-accent-gold" />
                    <span className="text-xs text-navy-300 font-medium">Points</span>
                  </div>
                  <select value={currentQ.points}
                    onChange={e => updateCurrentQ({ points: parseInt(e.target.value) })}
                    className="input-field text-sm py-2 bg-navy-800">
                    {[50, 100, 200, 500, 1000].map(p => (
                      <option key={p} value={p}>{p} pts</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Explanation */}
              <div className="card">
                <label className="text-sm font-medium text-navy-300 block mb-2">Explanation (shown after answer)</label>
                <textarea
                  value={currentQ.explanation}
                  onChange={e => updateCurrentQ({ explanation: e.target.value })}
                  className="input-field resize-none text-sm"
                  placeholder="Optional: explain why this is the correct answer..."
                  rows={2}
                />
              </div>

              {/* Mobile: add question */}
              <button onClick={addQuestion} className="w-full flex items-center justify-center gap-2 py-3 glass rounded-xl text-electric-blue hover:border-electric-blue/40 transition-all font-medium md:hidden">
                <Plus size={16} /> Add Question
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
