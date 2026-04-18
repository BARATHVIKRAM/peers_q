import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  Plus, Trash2, Save, ArrowLeft, Upload, Sparkles, Image as ImageIcon,
  ChevronUp, ChevronDown, Check, X, Clock, Star, GripVertical,
  AlignLeft, CheckSquare, List, ToggleLeft, Type
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import api from '../utils/api'
import toast from 'react-hot-toast'

const OPT_STYLES = [
  { border: '#0057FF', bg: 'rgba(0,87,255,0.06)', letter: '#0057FF', letterBg: 'rgba(0,87,255,0.1)' },
  { border: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', letter: '#8B5CF6', letterBg: 'rgba(139,92,246,0.1)' },
  { border: '#F59E0B', bg: 'rgba(245,158,11,0.06)', letter: '#F59E0B', letterBg: 'rgba(245,158,11,0.1)' },
  { border: '#EF4444', bg: 'rgba(239,68,68,0.06)', letter: '#EF4444', letterBg: 'rgba(239,68,68,0.1)' },
]
const LETTERS = ['A', 'B', 'C', 'D']

const Q_TYPES = [
  { value: 'multiple_choice', label: 'Single Choice', icon: List },
  { value: 'multiple_select', label: 'Multi-Select', icon: CheckSquare },
  { value: 'true_false', label: 'True / False', icon: ToggleLeft },
  { value: 'poll', label: 'Poll', icon: AlignLeft },
]

const defaultQuestion = () => ({
  id: uuidv4(),
  type: 'multiple_choice',
  text: '',
  image: '',
  options: [
    { id: uuidv4(), text: '', isCorrect: false },
    { id: uuidv4(), text: '', isCorrect: false },
    { id: uuidv4(), text: '', isCorrect: false },
    { id: uuidv4(), text: '', isCorrect: false },
  ],
  timeLimit: 30,
  points: 100,
  explanation: ''
})

const trueFalseQuestion = () => ({
  ...defaultQuestion(),
  type: 'true_false',
  options: [
    { id: uuidv4(), text: 'True', isCorrect: false },
    { id: uuidv4(), text: 'False', isCorrect: false },
  ]
})

export default function QuizEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [quiz, setQuiz] = useState({ title: 'Untitled Quiz', description: '', questions: [] })
  const [activeQ, setActiveQ] = useState(0)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [aiSettings, setAiSettings] = useState({
    questionCount: 10,
    difficulty: 'medium',
    customPrompt: '',
    pastedText: ''
  })
  const [aiTab, setAiTab] = useState('upload') // upload | paste
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  useEffect(() => {
    if (isEdit) {
      api.get(`/quiz/${id}`)
        .then(r => { setQuiz(r.data.quiz); setActiveQ(0) })
        .catch(() => toast.error('Failed to load quiz'))
    } else {
      setQuiz({ title: 'Untitled Quiz', description: '', questions: [defaultQuestion()] })
    }
  }, [id])

  const Q = quiz.questions[activeQ]

  const updateQ = (updates) =>
    setQuiz(q => ({ ...q, questions: q.questions.map((x, i) => i === activeQ ? { ...x, ...updates } : x) }))

  const updateOpt = (oi, updates) =>
    updateQ({ options: Q.options.map((o, i) => i === oi ? { ...o, ...updates } : o) })

  const setCorrect = (oi) => {
    if (Q.type === 'multiple_select') {
      // Toggle for multi-select
      updateQ({ options: Q.options.map((o, i) => i === oi ? { ...o, isCorrect: !o.isCorrect } : o) })
    } else {
      updateQ({ options: Q.options.map((o, i) => ({ ...o, isCorrect: i === oi })) })
    }
  }

  const moveOption = (oi, dir) => {
    const opts = [...Q.options]
    const target = oi + dir
    if (target < 0 || target >= opts.length) return
    ;[opts[oi], opts[target]] = [opts[target], opts[oi]]
    updateQ({ options: opts })
  }

  const changeType = (type) => {
    if (type === 'true_false') {
      updateQ({ type, options: [{ id: uuidv4(), text: 'True', isCorrect: false }, { id: uuidv4(), text: 'False', isCorrect: false }] })
    } else {
      const opts = Q.options.length < 2
        ? [{ id: uuidv4(), text: '', isCorrect: false }, { id: uuidv4(), text: '', isCorrect: false }]
        : Q.options.map(o => ({ ...o, isCorrect: type === 'poll' ? false : o.isCorrect }))
      updateQ({ type, options: opts })
    }
  }

  const addOption = () => {
    if (Q.options.length >= 6) return toast.error('Max 6 options')
    updateQ({ options: [...Q.options, { id: uuidv4(), text: '', isCorrect: false }] })
  }

  const removeOption = (oi) => {
    if (Q.options.length <= 2) return toast.error('Need at least 2 options')
    updateQ({ options: Q.options.filter((_, i) => i !== oi) })
  }

  const addQuestion = () => {
    const nq = defaultQuestion()
    setQuiz(q => ({ ...q, questions: [...q.questions, nq] }))
    setActiveQ(quiz.questions.length)
  }

  const deleteQuestion = (idx) => {
    if (quiz.questions.length === 1) return toast.error("Can't delete the only question")
    setQuiz(q => ({ ...q, questions: q.questions.filter((_, i) => i !== idx) }))
    setActiveQ(Math.max(0, activeQ - (idx <= activeQ ? 1 : 0)))
  }

  const moveQuestion = (idx, dir) => {
    const qs = [...quiz.questions]
    const target = idx + dir
    if (target < 0 || target >= qs.length) return
    ;[qs[idx], qs[target]] = [qs[target], qs[idx]]
    setQuiz(q => ({ ...q, questions: qs }))
    setActiveQ(target)
  }

  const handleAiGenerate = async (file) => {
    if (!file && !aiSettings.pastedText.trim()) return toast.error('Upload a file or paste text')
    setAiLoading(true)
    setShowAiPanel(false)
    const toastId = toast.loading('AI is generating your quiz...')

    try {
      let questionsData
      if (aiTab === 'paste' && aiSettings.pastedText.trim()) {
        // Send text directly via JSON
        const { data } = await api.post('/upload/generate-text', {
          text: aiSettings.pastedText,
          questionCount: aiSettings.questionCount,
          difficulty: aiSettings.difficulty,
          customPrompt: aiSettings.customPrompt
        })
        questionsData = data
      } else {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('questionCount', aiSettings.questionCount)
        formData.append('difficulty', aiSettings.difficulty)
        formData.append('customPrompt', aiSettings.customPrompt)
        const { data } = await api.post('/upload/generate', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        questionsData = data
      }

      // Shuffle options to randomize correct answer position
      const shuffled = questionsData.questions.map(q => ({
        ...q,
        options: shuffleArray([...q.options])
      }))

      setQuiz(q => ({
        ...q,
        title: q.title === 'Untitled Quiz' ? `Quiz from document` : q.title,
        questions: [...q.questions.filter(x => x.text.trim()), ...shuffled]
      }))
      setActiveQ(0)
      toast.success(`Generated ${shuffled.length} questions!`, { id: toastId })
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed', { id: toastId })
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
      const { data } = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateQ({ image: data.imageUrl })
      toast.success('Image added')
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!quiz.title.trim()) return toast.error('Add a quiz title')
    const validQs = quiz.questions.filter(q => q.text.trim())
    if (!validQs.length) return toast.error('Add at least one question')

    for (const q of validQs) {
      if (q.type !== 'poll' && !q.options.some(o => o.isCorrect)) {
        return toast.error(`"${q.text.substring(0, 40)}..." needs a correct answer`)
      }
    }

    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/quiz/${id}`, { ...quiz, questions: validQs })
        toast.success('Saved!')
      } else {
        const { data } = await api.post('/quiz', { ...quiz, questions: validQs })
        toast.success('Quiz created!')
        navigate(`/quiz/${data.quiz._id}/edit`, { replace: true })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!Q) return null

  const currentType = Q_TYPES.find(t => t.value === Q.type) || Q_TYPES[0]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--off-white)' }}>

      {/* Top bar */}
      <header className="nav-bar px-4">
        <div className="flex items-center gap-3 py-3 max-w-full">
          <Link to="/dashboard" className="btn-ghost p-2.5"><ArrowLeft size={18} /></Link>

          <div className="w-px h-6 mx-1" style={{ background: 'var(--paper)' }} />

          <input value={quiz.title}
            onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))}
            className="flex-1 bg-transparent font-display font-bold text-lg text-[var(--ink)] focus:outline-none min-w-0"
            placeholder="Quiz title..." />

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* AI Panel toggle */}
            <div className="relative">
              <button onClick={() => setShowAiPanel(!showAiPanel)}
                className="btn-secondary gap-2 py-2 px-3.5 text-sm" style={{ borderColor: 'rgba(0,87,255,0.3)' }}>
                <Sparkles size={15} style={{ color: 'var(--blue-vivid)' }} />
                <span className="hidden sm:inline font-display">AI Generate</span>
              </button>

              {showAiPanel && (
                <div className="absolute right-0 top-12 w-80 surface z-50 p-5"
                  style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} style={{ color: 'var(--blue-vivid)' }} />
                    <span className="font-display font-bold text-[var(--ink)]">AI Quiz Generator</span>
                    <button onClick={() => setShowAiPanel(false)} className="ml-auto btn-ghost p-1">
                      <X size={15} />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex rounded-xl p-1 mb-4" style={{ background: 'var(--paper)' }}>
                    {['upload', 'paste'].map(tab => (
                      <button key={tab} onClick={() => setAiTab(tab)}
                        className="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize"
                        style={{
                          background: aiTab === tab ? 'white' : 'transparent',
                          color: aiTab === tab ? 'var(--blue-vivid)' : 'var(--slate)',
                          boxShadow: aiTab === tab ? '0 1px 6px rgba(0,0,0,0.08)' : 'none'
                        }}>
                        {tab === 'upload' ? '📎 Upload' : '✏️ Paste Text'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-[var(--slate)] block mb-1.5">Number of Questions</label>
                      <input type="number" min="3" max="20" value={aiSettings.questionCount}
                        onChange={e => setAiSettings(s => ({ ...s, questionCount: parseInt(e.target.value) || 10 }))}
                        className="input-field py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--slate)] block mb-1.5">Difficulty</label>
                      <select value={aiSettings.difficulty}
                        onChange={e => setAiSettings(s => ({ ...s, difficulty: e.target.value }))}
                        className="input-field py-2 text-sm" style={{ background: 'var(--off-white)' }}>
                        <option value="easy">Easy — broad recall</option>
                        <option value="medium">Medium — applied knowledge</option>
                        <option value="hard">Hard — deep analysis</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--slate)] block mb-1.5">
                        Custom Instructions (optional)
                      </label>
                      <textarea value={aiSettings.customPrompt}
                        onChange={e => setAiSettings(s => ({ ...s, customPrompt: e.target.value }))}
                        className="input-field py-2 text-sm resize-none"
                        rows={2}
                        placeholder="e.g. Focus on chapter 3, use clinical terms..." />
                    </div>

                    {aiTab === 'paste' ? (
                      <>
                        <div>
                          <label className="text-xs font-semibold text-[var(--slate)] block mb-1.5">Paste your text</label>
                          <textarea value={aiSettings.pastedText}
                            onChange={e => setAiSettings(s => ({ ...s, pastedText: e.target.value }))}
                            className="input-field py-2 text-sm resize-none"
                            rows={5}
                            placeholder="Paste article, notes, textbook content..." />
                        </div>
                        <button
                          onClick={() => handleAiGenerate(null)}
                          disabled={!aiSettings.pastedText.trim() || aiLoading}
                          className="btn-primary w-full py-2.5 text-sm gap-2 disabled:opacity-50">
                          <Sparkles size={15} /> Generate Questions
                        </button>
                      </>
                    ) : (
                      <label className="btn-primary w-full py-2.5 text-sm gap-2 cursor-pointer flex items-center justify-center">
                        <Upload size={15} /> Upload PDF or TXT
                        <input type="file" accept=".pdf,.txt,.md" className="hidden"
                          onChange={e => { if (e.target.files[0]) handleAiGenerate(e.target.files[0]) }}
                          disabled={aiLoading} />
                      </label>
                    )}
                    <p className="text-xs text-center text-[var(--slate-light)]">
                      Powered by Groq · Options are automatically shuffled
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button onClick={save} disabled={saving}
              className="btn-primary gap-2 py-2 px-4 text-sm disabled:opacity-50">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Save size={15} /> Save</>
              }
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 border-r flex flex-col hidden md:flex"
          style={{ background: 'var(--white)', borderColor: 'rgba(0,87,255,0.07)' }}>
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs font-semibold text-[var(--slate)] uppercase tracking-wider px-2 mb-2">
              {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
            </p>
            {quiz.questions.map((q, idx) => (
              <div key={q.id} onClick={() => setActiveQ(idx)}
                className="group relative p-3 rounded-2xl mb-1 cursor-pointer transition-all"
                style={{
                  background: idx === activeQ ? 'rgba(0,87,255,0.07)' : 'transparent',
                  border: idx === activeQ ? '1.5px solid rgba(0,87,255,0.2)' : '1.5px solid transparent'
                }}>
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5"
                    style={{
                      background: idx === activeQ ? 'var(--blue-vivid)' : 'var(--paper)',
                      color: idx === activeQ ? 'white' : 'var(--slate)'
                    }}>
                    {idx + 1}
                  </span>
                  <span className="text-sm text-[var(--ink)] line-clamp-2 leading-snug flex-1"
                    style={{ color: !q.text ? 'var(--slate-light)' : 'var(--ink)', fontStyle: !q.text ? 'italic' : 'normal' }}>
                    {q.text || 'Untitled question'}
                  </span>
                </div>
                {/* valid indicator */}
                {q.options.some(o => o.isCorrect) && (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full"
                    style={{ background: 'var(--accent-green)' }} />
                )}
              </div>
            ))}
          </div>
          <div className="p-3 border-t" style={{ borderColor: 'rgba(0,87,255,0.07)' }}>
            <button onClick={addQuestion}
              className="btn-secondary w-full py-2.5 text-sm gap-1.5">
              <Plus size={15} /> Add Question
            </button>
          </div>
        </aside>

        {/* Main editor */}
        <main className="flex-1 overflow-y-auto p-6">
          {aiLoading ? (
            <div className="flex flex-col items-center justify-center h-80 gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-3 border-t-[var(--blue-vivid)] rounded-full animate-spin"
                  style={{ borderWidth: '3px', borderColor: 'var(--paper)', borderTopColor: 'var(--blue-vivid)' }} />
                <Sparkles size={20} className="absolute inset-0 m-auto" style={{ color: 'var(--blue-vivid)' }} />
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-xl text-[var(--ink)]">AI is building your quiz...</p>
                <p className="text-[var(--slate)] text-sm mt-1">This takes 10–20 seconds</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">

              {/* Q header */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-[var(--slate)]">
                  Q{activeQ + 1} / {quiz.questions.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveQuestion(activeQ, -1)} disabled={activeQ === 0}
                    className="btn-ghost p-2 disabled:opacity-30"><ChevronUp size={15} /></button>
                  <button onClick={() => moveQuestion(activeQ, 1)} disabled={activeQ === quiz.questions.length - 1}
                    className="btn-ghost p-2 disabled:opacity-30"><ChevronDown size={15} /></button>
                  <button onClick={() => deleteQuestion(activeQ)}
                    className="btn-ghost p-2"
                    style={{ color: 'var(--slate)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-coral)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--slate)'}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Question type selector */}
              <div className="surface p-4">
                <p className="text-xs font-semibold text-[var(--slate)] mb-3 uppercase tracking-wider">Question Type</p>
                <div className="grid grid-cols-4 gap-2">
                  {Q_TYPES.map(({ value, label, icon: Icon }) => (
                    <button key={value} onClick={() => changeType(value)}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: Q.type === value ? 'var(--blue-vivid)' : 'var(--paper)',
                        background: Q.type === value ? 'rgba(0,87,255,0.06)' : 'transparent'
                      }}>
                      <Icon size={16} style={{ color: Q.type === value ? 'var(--blue-vivid)' : 'var(--slate)' }} />
                      <span className="text-xs font-semibold leading-tight"
                        style={{ color: Q.type === value ? 'var(--blue-vivid)' : 'var(--slate)' }}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question text */}
              <div className="surface p-5">
                <textarea value={Q.text}
                  onChange={e => updateQ({ text: e.target.value })}
                  className="input-field resize-none text-base font-medium"
                  placeholder="Type your question here..."
                  rows={3} />
              </div>

              {/* Image */}
              <div className="surface p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[var(--ink)]">Question Image</span>
                  {Q.image && (
                    <button onClick={() => updateQ({ image: '' })}
                      className="btn-ghost p-1.5" style={{ color: 'var(--accent-coral)' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {Q.image ? (
                  <img src={Q.image} alt="" className="w-full h-36 object-cover rounded-2xl" />
                ) : (
                  <label className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
                    style={{ borderColor: 'var(--paper)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue-electric)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--paper)'}>
                    <ImageIcon size={20} style={{ color: 'var(--slate-light)' }} />
                    <span className="text-xs text-[var(--slate)]">Click to upload image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              {/* Options */}
              {Q.type !== 'open_ended' && (
                <div className="surface p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      Answer Options
                      {Q.type === 'multiple_select' && (
                        <span className="ml-2 chip chip-blue text-xs">Select all correct</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--slate-light)]">Drag ⠿ to reorder</span>
                      {Q.type !== 'true_false' && (
                        <button onClick={addOption}
                          className="text-xs font-semibold flex items-center gap-1 transition-colors"
                          style={{ color: 'var(--blue-vivid)' }}>
                          <Plus size={13} /> Add
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Q.options.map((opt, oi) => {
                      const s = OPT_STYLES[oi % OPT_STYLES.length]
                      return (
                        <div key={opt.id}
                          className="flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all"
                          style={{
                            borderColor: opt.isCorrect ? 'var(--accent-green)' : s.border + '40',
                            background: opt.isCorrect ? 'rgba(0,232,122,0.05)' : s.bg
                          }}>
                          {/* Drag handle */}
                          <GripVertical size={14} style={{ color: 'var(--slate-light)', cursor: 'grab', flexShrink: 0 }} />

                          {/* Move up/down */}
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveOption(oi, -1)} disabled={oi === 0}
                              className="p-0.5 rounded disabled:opacity-20 hover:opacity-70 transition-opacity">
                              <ChevronUp size={11} style={{ color: 'var(--slate)' }} />
                            </button>
                            <button onClick={() => moveOption(oi, 1)} disabled={oi === Q.options.length - 1}
                              className="p-0.5 rounded disabled:opacity-20 hover:opacity-70 transition-opacity">
                              <ChevronDown size={11} style={{ color: 'var(--slate)' }} />
                            </button>
                          </div>

                          <span className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: s.letterBg, color: s.letter }}>
                            {LETTERS[oi] || oi + 1}
                          </span>

                          <input value={opt.text}
                            onChange={e => updateOpt(oi, { text: e.target.value })}
                            disabled={Q.type === 'true_false'}
                            className="flex-1 bg-transparent text-sm text-[var(--ink)] focus:outline-none placeholder:text-[var(--slate-light)] font-medium"
                            placeholder={`Option ${LETTERS[oi] || oi + 1}...`} />

                          {Q.type !== 'poll' && (
                            <button onClick={() => setCorrect(oi)}
                              className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={{
                                borderColor: opt.isCorrect ? 'var(--accent-green)' : 'var(--paper)',
                                background: opt.isCorrect ? 'var(--accent-green)' : 'transparent',
                                color: opt.isCorrect ? 'white' : 'transparent'
                              }}>
                              <Check size={13} />
                            </button>
                          )}

                          {Q.type !== 'true_false' && Q.options.length > 2 && (
                            <button onClick={() => removeOption(oi)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg transition-all opacity-40 hover:opacity-100"
                              style={{ color: 'var(--accent-coral)' }}>
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="surface p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} style={{ color: 'var(--blue-vivid)' }} />
                    <span className="text-xs font-semibold text-[var(--ink)]">Time Limit</span>
                  </div>
                  <select value={Q.timeLimit} onChange={e => updateQ({ timeLimit: parseInt(e.target.value) })}
                    className="input-field text-sm py-2" style={{ background: 'var(--off-white)' }}>
                    {[10, 15, 20, 30, 45, 60, 90, 120].map(t => (
                      <option key={t} value={t}>{t} seconds</option>
                    ))}
                  </select>
                </div>
                <div className="surface p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={14} style={{ color: 'var(--accent-gold)' }} />
                    <span className="text-xs font-semibold text-[var(--ink)]">Points</span>
                  </div>
                  <select value={Q.points} onChange={e => updateQ({ points: parseInt(e.target.value) })}
                    className="input-field text-sm py-2" style={{ background: 'var(--off-white)' }}>
                    {[50, 100, 200, 500, 1000].map(p => (
                      <option key={p} value={p}>{p} points</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Explanation */}
              <div className="surface p-4">
                <label className="text-sm font-semibold text-[var(--ink)] block mb-2">
                  Explanation <span className="text-[var(--slate-light)] font-normal">(shown after answer)</span>
                </label>
                <textarea value={Q.explanation}
                  onChange={e => updateQ({ explanation: e.target.value })}
                  className="input-field resize-none text-sm"
                  placeholder="Optional: explain why this is correct..."
                  rows={2} />
              </div>

              {/* Mobile add button */}
              <button onClick={addQuestion} className="btn-secondary w-full py-3 gap-2 md:hidden">
                <Plus size={16} /> Add Question
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
