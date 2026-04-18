import { Link } from 'react-router-dom'
import { Zap, Users, BarChart2, Brain, ChevronRight, Star, Sparkles, QrCode, Trophy, Clock } from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Quiz Generation',
    desc: 'Upload any PDF or paste text. Our AI generates perfectly balanced questions with shuffled answers in seconds.',
    color: '#0057FF',
    bg: 'rgba(0,87,255,0.07)'
  },
  {
    icon: Users,
    title: '50 Live Participants',
    desc: 'Real-time WebSocket sync. Everyone sees questions simultaneously, zero lag, zero dropped answers.',
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.07)'
  },
  {
    icon: Trophy,
    title: 'Animated Leaderboard',
    desc: 'Players move up and down in slow motion after every question. See streaks, ranks, and crowns live.',
    color: '#FFB800',
    bg: 'rgba(255,184,0,0.08)'
  },
  {
    icon: QrCode,
    title: 'Instant QR Join',
    desc: 'Scan to join — no app, no login. Works on any phone browser instantly.',
    color: '#00E87A',
    bg: 'rgba(0,232,122,0.07)'
  },
  {
    icon: Clock,
    title: 'Timed Scoring',
    desc: 'Faster correct answers earn more points. Speed and knowledge both matter.',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.07)'
  },
  {
    icon: Sparkles,
    title: 'Beyond Mentimeter',
    desc: 'Multi-select questions, custom complexity prompts, drag-to-reorder options, streaks, and winner celebrations.',
    color: '#FF4060',
    bg: 'rgba(255,64,96,0.07)'
  }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--off-white)' }}>
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] opacity-30"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(0,87,255,0.12) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-20"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(0,212,255,0.1) 0%, transparent 60%)' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,87,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,87,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
      </div>

      {/* Nav */}
      <nav className="nav-bar">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0057FF,#003ABF)' }}>
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-xl text-[var(--ink)]">PeersQ</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/join" className="btn-ghost text-sm px-4 py-2">Join Quiz</Link>
            <Link to="/login" className="btn-secondary text-sm px-4 py-2.5">Login</Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2.5">
              Get Started <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 mb-8 anim-fade-up"
          style={{
            background: 'rgba(0,87,255,0.08)',
            border: '1px solid rgba(0,87,255,0.15)',
            borderRadius: '99px',
            padding: '7px 16px'
          }}>
          <Star size={13} fill="var(--blue-vivid)" style={{ color: 'var(--blue-vivid)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--blue-vivid)' }}>
            Free forever · Up to 50 live participants
          </span>
        </div>

        <h1 className="font-display font-bold text-[clamp(3rem,8vw,6rem)] text-[var(--ink)] mb-6 anim-fade-up d1"
          style={{ lineHeight: 1.02, letterSpacing: '-0.04em' }}>
          The quiz platform
          <br />
          <span style={{
            background: 'linear-gradient(135deg,#0057FF,#00D4FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>that moves fast.</span>
        </h1>

        <p className="text-xl text-[var(--slate)] max-w-2xl mx-auto mb-10 leading-relaxed anim-fade-up d2">
          Upload a document, let AI build your quiz, and watch 50 people compete live —
          with animated leaderboards, QR joining, and a winner celebration they'll remember.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 anim-fade-up d3">
          <Link to="/register" className="btn-primary text-base px-8 py-4 gap-2.5">
            <Zap size={18} fill="white" />
            Create Your First Quiz
          </Link>
          <Link to="/join" className="btn-secondary text-base px-8 py-4">
            Join with a Code
          </Link>
        </div>

        {/* Hero visual */}
        <div className="mt-20 relative anim-fade-up d4">
          <div className="max-w-3xl mx-auto surface p-1 shadow-blue-lg"
            style={{ borderRadius: '28px' }}>
            <div className="rounded-3xl overflow-hidden"
              style={{ background: 'var(--ink)', minHeight: '300px', padding: '32px' }}>
              {/* Fake quiz preview */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#FF4060' }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: '#FFB800' }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: '#00E87A' }} />
                </div>
                <div className="chip chip-blue">
                  <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  LIVE · 38 players
                </div>
              </div>
              <div className="text-center mb-8">
                <p className="text-white/40 text-xs font-mono mb-3">QUESTION 3 OF 10 · 18s remaining</p>
                <h3 className="text-white text-xl font-display font-bold mb-1">
                  Which planet has the most moons in our solar system?
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'A', text: 'Jupiter', color: '#0057FF' },
                  { label: 'B', text: 'Saturn', color: '#8B5CF6', selected: true },
                  { label: 'C', text: 'Uranus', color: '#F59E0B' },
                  { label: 'D', text: 'Neptune', color: '#EF4444' }
                ].map(opt => (
                  <div key={opt.label}
                    className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                    style={{
                      background: opt.selected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${opt.selected ? '#8B5CF6' : 'rgba(255,255,255,0.07)'}`,
                      transform: opt.selected ? 'translateY(-2px)' : 'none'
                    }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: opt.color }}>
                      {opt.label}
                    </span>
                    <span className="text-white text-sm font-medium">{opt.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 surface p-3 shadow-blue-md anim-float hidden md:flex items-center gap-2.5"
            style={{ borderRadius: '16px' }}>
            <span className="text-2xl">🥇</span>
            <div>
              <p className="text-xs font-bold text-[var(--ink)]">Sarah K.</p>
              <p className="text-xs font-mono text-[var(--blue-vivid)]">1,240 pts</p>
            </div>
          </div>
          <div className="absolute -right-4 top-1/3 surface p-3 shadow-blue-md hidden md:flex items-center gap-2 anim-float"
            style={{ borderRadius: '16px', animationDelay: '1s' }}>
            <Sparkles size={16} style={{ color: 'var(--accent-gold)' }} />
            <span className="text-xs font-bold text-[var(--ink)]">AI Generated ✓</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="font-display font-bold text-4xl text-[var(--ink)] mb-3"
            style={{ letterSpacing: '-0.02em' }}>
            Everything Mentimeter doesn't have
          </h2>
          <p className="text-[var(--slate)] text-lg">Built for teachers, trainers, and anyone who wants real engagement.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
            <div key={title} className={`surface p-6 group cursor-default anim-fade-up d${i + 1} hover:shadow-card-hover transition-all duration-300`}
              style={{ ':hover': { transform: 'translateY(-4px)' } }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ background: bg }}>
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="font-display font-bold text-lg text-[var(--ink)] mb-2">{title}</h3>
              <p className="text-[var(--slate)] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl p-12 text-center overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg,#0057FF 0%,#003ABF 100%)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
          <h2 className="font-display font-bold text-4xl text-white mb-4 relative z-10"
            style={{ letterSpacing: '-0.02em' }}>
            Ready to run your first quiz?
          </h2>
          <p className="text-white/70 text-lg mb-8 relative z-10">Free to start. No credit card. Live in 2 minutes.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
            <Link to="/register"
              className="inline-flex items-center gap-2 font-display font-bold text-base px-8 py-4 rounded-2xl transition-all hover:scale-105"
              style={{ background: 'white', color: 'var(--blue-vivid)' }}>
              <Zap size={18} fill="var(--blue-vivid)" />
              Start for Free
            </Link>
            <Link to="/join"
              className="inline-flex items-center gap-2 font-display font-bold text-base px-8 py-4 rounded-2xl transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
              Join a Quiz
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
